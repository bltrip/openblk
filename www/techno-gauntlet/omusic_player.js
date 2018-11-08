function OMusicPlayer() {

    this.dev = typeof (omg) == "object" && omg.dev;

    var p = this;

    p.playing = false;
    p.loadedSounds = {};
    p.downloadedSoundSets = {};

    if (!window.AudioContext)
        window.AudioContext = window.webkitAudioContext;

    try {
        p.context = new AudioContext();
        if (!p.context.createGain)
            p.context.createGain = p.context.createGainNode;

    } catch (e) {
        var nowebaudio = document.getElementById("no-web-audio");
        if (nowebaudio)
            nowebaudio.style.display = "inline-block";
        //return;
    }

    p.compressor = p.context.createDynamicsCompressor();
    p.compressor.threshold.value = -50;
    p.compressor.knee.value = 40;
    p.compressor.ratio.value = 2;
    p.compressor.attack.value = 0;
    p.compressor.release.value = 0.25;
    p.compressor.connect(p.context.destination);

    p.onBeatPlayedListeners = [];

    p.iSubBeat = 0;
    p.loopStarted = 0;

    p.nextUp = null;

    p.loopSection = -1;
}


OMusicPlayer.prototype.play = function (song) {
    var p = this;
    if (!p.context)
        return;

    if (song) {
        if (!p.prepareSong(song)) {
            return;
        }
    }

    // if there is no song already here, this'll blow
    p.song.playingSection = 0;

    if (!p.song.sections || !p.song.sections.length) {
        console.log("no sections to play()");
        return -1;
    }

    p.playing = true;
    p.loopStarted = Date.now();
    p.iSubBeat = 0;

    //todo this bpm thing isn't consistent
    var beatParameters = p.song.data.beatParameters;
    var beatsPerSection = beatParameters.beats * beatParameters.subbeats * 
                                        beatParameters.measures;
    if (beatParameters.bpm) {
        p.subbeatLength = 1000 / (beatParameters.bpm / 60 * beatParameters.subbeats);
    }
    else if (beatParameters.subbeatMillis) {
        p.subbeatLength = beatParameters.subbeatMillis;
    }
    else if (p.song.sections[0].data &&
            p.song.sections[0].data.beatParameters &&
            p.song.sections[0].data.beatParameters.subbeatMillis) {
        p.subbeatLength = p.song.sections[0].data.beatParameters.subbeatMillis;
    } 
    else {
        p.subbeatLength = 125;
    }

    var lastSection;
    var nextSection;
    var currentChordI = 0;

    var play = function () {

        if (!p.playing)
            return;

        if (p.loopSection > -1 && p.loopSection < p.song.sections.length) {
            p.song.playingSection = p.loopSection;
        }

        p.playBeat(p.song.sections[p.song.playingSection],
                p.iSubBeat);

        for (var il = 0; il < p.onBeatPlayedListeners.length; il++) {
            try {
                p.onBeatPlayedListeners[il].call(null, p.iSubBeat, p.song.playingSection);
            } catch (ex) {
                console.log(ex);
            }
        }

        p.iSubBeat++;
        if (p.iSubBeat == beatsPerSection) {

            p.iSubBeat = 0;
            p.loopStarted = Date.now();

            if (p.song.sections[p.song.playingSection].data.chordProgression) {
                currentChordI++;
                if (currentChordI < p.song.sections[p.song.playingSection].data.chordProgression.length) {
                    p.rescaleSong(null, null,
                                p.song.sections[p.song.playingSection].data.chordProgression[currentChordI]);
                    return;
                }
                else {
                    currentChordI = 0;
                    p.rescaleSong(null, null,
                                p.song.sections[p.song.playingSection].data.chordProgression[currentChordI]);
                }
            }

            lastSection = p.song.sections[p.song.playingSection];

            if (p.loopSection == -1) {
                p.song.playingSection++;
            }

            if (p.nextUp) {
                p.song = p.nextUp;
                p.song.playingSection = 0;
                p.nextUp = null;
            }

            nextSection = p.song.sections[p.song.playingSection];

            if (p.song.playingSection >= p.song.sections.length) {
                if (p.song.loop) {
                    p.song.playingSection = 0;
                    nextSection = p.song.sections[p.song.playingSection];
                } else {
                    p.stop();
                    nextSection = undefined;
                }
            }

            //cancel all oscilators that aren't used next section
            //TODO make this work right
            var usedAgain;
            for (var ils = 0; ils < lastSection.parts.length; ils++) {
                if (!lastSection.parts[ils].osc)
                    continue;

                usedAgain = false;
                if (nextSection) {
                    for (var ins = 0; ins < nextSection.parts.length; ins++) {
                        if (lastSection.parts[ils] == nextSection.parts[ins]) {
                            usedAgain = true;
                            break;
                        }
                    }
                }
                if (!usedAgain) {
                    lastSection.parts[ils].osc.finishPart();
                }
            }
        }

        if (p.newBPM) {
            clearInterval(p.playingIntervalHandle);
            p.subbeatLength = 1000 / (p.newBPM / 60 * beatParameters.subbeats);
            p.playingIntervalHandle = setInterval(play, p.subbeatLength);
            p.newBPM = undefined;
        }
    };

    p.playingIntervalHandle = setInterval(play, p.subbeatLength);

    // ??
    p.songStarted = p.loopStarted;

    if (typeof (p.onPlay) == "function") {
        p.onPlay();
    }

    return p.playingIntervalHandle;
};

OMusicPlayer.prototype.stop = function () {
    var p = this;

    clearInterval(p.playingIntervalHandle);
    p.playing = false;

    if (typeof (p.onStop) == "function") {
        p.onStop();
    }

    if (p.song && p.song.sections[p.song.playingSection]) {
        var parts = p.song.sections[p.song.playingSection].parts;
        for (var ip = 0; ip < parts.length; ip++) {
            if (parts[ip].osc) {
                parts[ip].osc.finishPart();
            }

        }
    }
};

OMusicPlayer.prototype.loadPart = function (part) {
    var p = this;

    var type = part.data.type;
    var surface = part.data.surface ? part.data.surface.url : part.data.surfaceURL;

    part.soundsLoading = 0;
    part.loaded = false;

    if (type === "PART") {

        if (surface === "PRESET_SEQUENCER") {
            this.loadDrumbeat(part);
        } else {
            this.loadMelody(part);
        }

    }
    if (type == "CHORDPROGRESSION") {
        part.loaded = true;
    }
};

OMusicPlayer.prototype.loadMelody = function (part) {
    var p = this;

    var data = part.data;
    
    var section = part.section;
    var song = part.section ? part.section.song : undefined;

    p.rescale(part, song.data.keyParameters, 0);

    if (data.soundSet && typeof data.soundSet.url === "string") {
        p.getSoundSet(data.soundSet.url, function (soundset) {
            p.setupPartWithSoundSet(soundset, part, true);
        });
        if (data.soundSet.url.startsWith("PRESET_OSC")) {
            p.makeOsc(part);
        }
    }
    else if (data.soundSet && data.soundSet.data) {
        p.setupPartWithSoundSet(data.soundSet, part, true);
    }
    var soundsToLoad = 0;

    for (var ii = 0; ii < data.notes.length; ii++) {
        note = data.notes[ii];

        if (note.rest)
            continue;

        if (!note.sound)
            continue;

        if (p.loadedSounds[note.sound])
            continue;

        soundsToLoad++;
        p.loadSound(note.sound, part);
    }

    if (soundsToLoad == 0) {
        part.loaded = true;
        console.log(part.data.soundSet.name + " loaded");
    }

};

OMusicPlayer.prototype.loadDrumbeat = function (part) {
    var soundsAlreadyLoaded = 0;

    var tracks = part.data.tracks;

    for (var i = 0; i < tracks.length; i++) {
        if (!tracks[i].sound) {
            soundsAlreadyLoaded++;
        } else if (this.loadedSounds[tracks[i].sound]) {
            //tracks[i].audio = p.loadedSounds[tracks[i].sound];
            soundsAlreadyLoaded++;
        } else {
            this.loadSound(tracks[i].sound, part);
        }
    }
    if (soundsAlreadyLoaded == tracks.length) {
        part.loaded = true;
    }

};

OMusicPlayer.prototype.playWhenReady = function (sections) {
    var p = this;
    var allReady = true;

    for (var i = 0; i < sections.length; i++) {
        for (var j = 0; j < sections[i].parts.length; j++) {
            if (!sections[i].parts[j].loaded) {
                allReady = false;
                console.log("section " + i + " part " + j + " is not ready");
            }
        }
    }
    if (!allReady) {
        setTimeout(function () {
            p.playWhenReady(sections);
        }, 600);
    } else {
        p.play(sections);
    }
};

OMusicPlayer.prototype.prepareSong = function (song) {
    var p = this;
    
    var section;
    var part;

    for (var isection = 0; isection < song.sections.length; isection++) {

        section = song.sections[isection];
        for (var ipart = 0; ipart < section.parts.length; ipart++) {
            part = section.parts[ipart];
            p.loadPart(part);
        }
    }

    if (p.playing) {
        p.nextUp = song;
        return false;
    }

    p.song = song;
    return true;
};



OMusicPlayer.prototype.playBeat = function (section, iSubBeat) {
    var p = this;
    for (var ip = 0; ip < section.parts.length; ip++) {
        p.playBeatForPart(iSubBeat, section.parts[ip]);
    }


};

OMusicPlayer.prototype.playBeatForPart = function (iSubBeat, part) {
    var p = this;
    if (part.data.type == "CHORDPROGRESSION") {
        //TODO should this really be in here? As a part that is?
        return;
    }

    if (!part.loaded) {
        p.loadPart(part);
    }

    var surface = part.data.surface ? part.data.surface.url : part.data.surfaceURL;
    if (surface === "PRESET_SEQUENCER") {
        p.playBeatForDrumPart(iSubBeat, part);
    } else {
        p.playBeatForMelody(iSubBeat, part);
    }
};

OMusicPlayer.prototype.playBeatForDrumPart = function (iSubBeat, part) {
    var tracks = part.data.tracks;

    if (part.data.audioParameters.mute)
        return;

    for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].data[iSubBeat]) {
            this.playSound(tracks[i].sound, part);
        }
    }
};

OMusicPlayer.prototype.playBeatForMelody = function (iSubBeat, part) {
    var p = this;
    var data = part.data;
    var beatToPlay = iSubBeat;
    if (iSubBeat == 0) {
        // this sort of works, for playing melodies longer than 
        // the section goes, but taking it solves problems
        // the one I'm solving now is putting currentI in the right state
        // every time, so it doesn't stop the current section if the same
        // melody is in upnext play list
        //if (part.currentI === -1 || part.currentI === data.notes.length) {
        part.currentI = 0;
        part.nextBeat = 0;
        part.loopedBeats = 0;
        //}
        //else {
        //  if (!part.loopedBeats) part.loopedBeats = 0;
        //  part.loopedBeats += 32;
        //}
    }

    if (part.loopedBeats) {
        beatToPlay += part.loopedBeats;
    }

    if (part.liveNotes && part.liveNotes.length > 0) {
        this.playBeatWithLiveNote(iSubBeat, part);
        return;
    }

    if (beatToPlay === part.nextBeat) {
        if (!data.notes) {
            console.log("something wrong here");
            return;
        }
        var note = data.notes[part.currentI];

        if (part.data.audioParameters.mute) {
            //play solo they can't here ya
        }
        else if (note) {
            p.playNote(note, part, data);
        }
            
        if (note) {
            part.nextBeat += p.song.data.beatParameters.subbeats * note.beats;
            part.currentI++;
        }
    }
};

OMusicPlayer.prototype.playBeatWithLiveNote = function (iSubBeat, part) {
    if (!part.liveNotes || !part.liveNotes.length) {
        return;
    }

    if (part.liveNotes.autobeat > 0) {
        if (iSubBeat % part.liveNotes.autobeat === 0) {
            var note = {note: part.liveNotes[0].note,
                scaledNote: part.liveNotes[0].scaledNote,
                beats: part.liveNotes.autobeat / part.section.song.data.beatParameters.subbeats};
            if (part.soundSet) {
                note.sound = this.getSound(part.soundSet, part.liveNotes[0]);
            }

            this.playNote(note, part);
            if (!part.data.audioParameters.mute) {
                this.recordNote(part, note);
            }
        }
    }
    else {
        this.extendNote(part, part.liveNotes[0]);    
    }
};

OMusicPlayer.prototype.extendNote = function (part, note) {
    for (var i = 0; i < part.data.notes.length; i++) {
        if (part.data.notes[i] === note) {
            note.beats += 0.25;
            if (part.data.notes[i + 1]) {
                if (part.data.notes[i + 1].beats > 0.25) {
                    part.data.notes[i + 1].beats -= 0.25;
                    part.data.notes[i + 1].rest = true;
                }
                else {
                    part.data.notes.splice(i + 1, 1);
                }
            }
            break;
        }
    }
};

OMusicPlayer.prototype.makeOsc = function (part) {
    var p = this;

    if (!p.context) {
        return;
    }

    if (part.osc) {
        console.log("makeOsc, already exists");
        try {
            part.osc.stop(p.context.currentTime);
            part.osc.disconnect(part.gain);
            part.gain.disconnect(part.panner);
            part.panner.disconnect(p.compressor);
        } catch (e) {
        }
    }

    part.osc = p.context.createOscillator();

    var soundsetURL = part.data.soundSet.url ||
            "PRESET_OSC_TRIANGLE_SOFT_DELAY";
    if (soundsetURL.indexOf("SAW") > -1) {
        part.osc.type = "sawtooth";
    } else if (soundsetURL.indexOf("SINE") > -1) {
        part.osc.type = "sine";
    } else if (soundsetURL.indexOf("SQUARE") > -1) {
        part.osc.type = "square";
    }
    else if (soundsetURL.indexOf("TRIANGLE") > -1) {
        part.osc.type = "triangle";
    }

    part.gain = p.context.createGain();
    part.delay = p.context.createDelay();
    part.panner = p.context.createStereoPanner();
    part.feedback = p.context.createGain();
    
    part.osc.connect(part.gain);
    part.gain.connect(part.panner);

    part.gain.connect(part.delay);
    part.delay.connect(part.feedback);
    part.feedback.connect(part.delay);
    part.feedback.connect(part.panner);
    
    part.panner.connect(p.compressor);
    
    part.delay.delayTime.value = part.data.audioParameters.delayTime || 0;
    part.feedback.gain.value = part.data.audioParameters.delayLevel || 0;
    part.panner.pan.setValueAtTime(part.data.audioParameters.pan, p.context.currentTime);

    var volume = part.data.audioParameters.volume;
    if (part.data.audioParameters.mute) {
        part.gain.gain.setValueAtTime(0, p.context.currentTime);
        part.gain.gain.preMuteGain = volume;
    } else {
        part.gain.gain.setValueAtTime(volume, p.context.currentTime);
    }

    part.osc.frequency.setValueAtTime(0, p.context.currentTime);
    part.osc.start(p.context.currentTime);

    part.osc.finishPart = function () {
        part.gain.gain.setValueAtTime(0, p.context.currentTime);

        //total hack, this is why things should be processed ala AudioContext, not our own thread
        setTimeout(function () {
            part.osc.stop(p.context.currentTime);
            part.osc.disconnect(part.gain);
            part.gain.disconnect(part.panner);
            part.panner.disconnect(p.compressor);

            part.oscStarted = false;
            part.osc = null;
            part.gain = null;
        }, 50);
    };

    part.oscStarted = true;

};

OMusicPlayer.prototype.makeFrequency = function (mapped) {
    return Math.pow(2, (mapped - 69.0) / 12.0) * 440.0;
};

OMusicPlayer.prototype.initSound = function () {
    var p = this;
    p.playedSound = true;
    try {
        var osc = p.context.createOscillator();
        osc.connect(p.context.destination);
        osc.frequency.setValueAtTime(0, p.context.currentTime);
        osc.start(p.context.currentTime);

        setTimeout(function () {
            osc.stop(p.context.currentTime);
            osc.disconnect(p.context.destination);

        }, 500);
    } catch (ex) {
        console.log("error initializing web audio api");
    }
};

OMusicPlayer.prototype.loadSound = function (sound, part) {
    var p = this;

    if (!sound || !p.context) {
        return;
    }

    var key = sound;
    var url = sound;
    if (sound.indexOf("PRESET_") == 0) {
        var preseturl;
        if (!p.dev) {
            preseturl = "http://mikehelland.com/omg/drums/";
        } else {
            preseturl = "http://localhost:8888/music/audio/";
            //preseturl = "http://localhost:8889/audio/";
        }
        url = preseturl + sound.substring(7).toLowerCase() + ".mp3";
    }

    p.loadedSounds[key] = "loading";

    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    part.soundsLoading++;

    // Decode asynchronously
    request.onload = function () {
        p.context.decodeAudioData(request.response, function (buffer) {
            p.loadedSounds[key] = buffer;
            p.onSoundLoaded(true, part);
        }, function () {
            console.log("error loading sound url: " + url);
            p.onSoundLoaded(false, part);
        });
    }
    request.send();

};

OMusicPlayer.prototype.onSoundLoaded = function (success, part) {
    var p = this;

    part.soundsLoading--;
    if (part.soundsLoading < 1) {
        part.loaded = true;
    }
};

OMusicPlayer.prototype.rescale = function (part, keyParameters, chord) {
    var p = this;

    var data = part.data;
    if (!data || !data.notes) {
        return;
    }

    var octave = data.soundSet.octave;
    var octaves2;
    var newNote;
    var onote;
    var note;

    for (var i = 0; i < data.notes.length; i++) {
        onote = data.notes[i];
        if (onote.rest) {
            continue;
        }

        newNote = onote.note + chord;
        octaves2 = 0;
        while (newNote >= keyParameters.scale.length) {
            newNote = newNote - keyParameters.scale.length;
            octaves2++;
        }
        while (newNote < 0) {
            newNote = newNote + keyParameters.scale.length;
            octaves2--;
        }

        newNote = keyParameters.scale[newNote] + octaves2 * 12 + 
                octave * 12 + keyParameters.rootNote;

        onote.scaledNote = newNote;
    }

    if (part.soundSet) {
        p.setupPartWithSoundSet(part.soundSet, part, true);
    }
};

OMusicPlayer.prototype.setupPartWithSoundSet = function (ss, part, load) {
    var p = this;

    if (!ss)
        return;

    var topNote = ss.highNote;
    if (!topNote && ss.data.length) {
        topNote = ss.lowNote + ss.data.length - 1;
    }
    if (!ss.octave) {
        ss.octave = Math.floor((topNote + ss.lowNote) / 2 / 12);
    }
    if (part.data.soundSet && !part.data.soundSet.octave) {
        part.data.soundSet.octave = ss.octave;
    }


    part.soundSet = ss;
    var note;
    var noteIndex;

    var prefix = ss.prefix || "";
    var postfix = ss.postfix || "";

    for (var ii = 0; ii < part.data.notes.length; ii++) {
        note = part.data.notes[ii];

        if (note.rest)
            continue;

        if (ss.chromatic) {
            noteIndex = note.scaledNote - ss.lowNote;
            if (noteIndex < 0) {
                noteIndex = noteIndex % 12 + 12;
            } else {
                while (noteIndex >= ss.data.length) {
                    noteIndex = noteIndex - 12;
                }
            }
        }
        else {
            noteIndex = note.note;
        }

        if (!ss.data[noteIndex]) {
            continue;
        }
        note.sound = prefix + ss.data[noteIndex].url + postfix;

        if (!note.sound)
            continue;

        if (load && !p.loadedSounds[note.sound]) {
            p.loadSound(note.sound, part);
        }
    }

};

OMusicPlayer.prototype.setupDrumPartWithSoundSet = function (ss, part, load) {
    var p = this;

    if (!ss)
        return;

    var prefix = ss.prefix || "";
    var postfix = ss.postfix || "";

    var track;

    for (var ii = 0; ii < Math.max(part.data.tracks.length, ss.data.length); ii++) {
        track = part.data.tracks[ii];
        if (!track) {
            track = {};
            track.data = [];
            track.data[p.getTotalSubbeats()] = false;
            part.data.tracks.push(track);
        }

        if (ii < ss.data.length) {
            track.sound = prefix + ss.data[ii].url + postfix;
            track.name = ss.data[ii].name;            
        }
        else {
            track.sound = "";
            track.name = "";
        }

        if (!track.sound)
            continue;

        if (load && !p.loadedSounds[track.sound]) {
            p.loadSound(track.sound, part);
        }
    }

};

OMusicPlayer.prototype.getSoundSet = function (url, callback) {
    var p = this;

    if (typeof url != "string") {
        return;
    }

    if (!callback) {
        callback = function () {};
    }

    var dl = p.downloadedSoundSets[url];
    if (dl) {
        callback(dl)
        return;
    }

    if (url.indexOf("PRESET_") == 0) {
        dl = p.getPresetSoundSet(url);
        p.downloadedSoundSets[url] = dl;
        callback(dl);
        return;
    }

    var xhr2 = new XMLHttpRequest();
    xhr2.open("GET", url, true)
    xhr2.onreadystatechange = function () {

        if (xhr2.readyState == 4) {
            var ojson = JSON.parse(xhr2.responseText);
            console.log("ojson")
            console.log(ojson);
            if (ojson) {
                p.downloadedSoundSets[url] = ojson;
                p.loadSoundsFromSoundSet(ojson);
                callback(ojson);
            } else {
                callback(ojson);
            }
        }
    };
    xhr2.send();

};

OMusicPlayer.prototype.loadSoundsFromSoundSet = function (soundSet) {
    for (var i = 0; i < soundSet.data.length; i++) {
        this.loadSound((soundSet.prefix || "") + soundSet.data[i].url + 
            (soundSet.postfix || ""), {});
    }
};


OMusicPlayer.prototype.getPresetSoundSet = function (preset) {
    var p = this;

    var oret;
    if (preset == "PRESET_BASS") {
        oret = {"name": "Electric Bass", "id": 1540004, "lowNote": 28, "chromatic": true,
            "data": [
                    {"url": "e", "caption": "E2"}, {"url": "f", "caption": "F2"}, {"url": "fs", "caption": "F#2"}, {"url": "g", "caption": "G2"}, {"url": "gs", "caption": "G#2"}, {"url": "a", "caption": "A2"},
                    {"url": "bf", "caption": "Bb2"}, {"url": "b", "caption": "B2"}, {"url": "c", "caption": "C3"}, {"url": "cs", "caption": "C#3"}, {"url": "d", "caption": "D3"}, {"url": "ds", "caption": "Eb3"},
                    {"url": "e2", "caption": "E3"}, {"url": "f2", "caption": "F3"}, {"url": "fs2", "caption": "F#3"}, {"url": "g2", "caption": "G3"}, {"url": "gs2", "caption": "G#3"}, {"url": "a2", "caption": "A3"},
                    {"url": "bf2", "caption": "Bb3"}, {"url": "b2", "caption": "B3"}, {"url": "c2", "caption": "C4"}
                ], "prefix": "http://mikehelland.com/omg/bass1/bass_",
                "postfix": ".mp3"};

        if (p.dev) {
            oret.data.prefix = "http://localhost/mp3/bass_";
        }
    }
    if (preset == "PRESET_HIP") {
        oret = {"name": "PRESET_HIP", "id": 0,
            "data": {"name": "PRESET_HIP", "data": [
                    {"url": "PRESET_HH_KICK", "caption": "kick"},
                    {"url": "PRESET_HH_CLAP", "caption": "clap"},
                    {"url": "PRESET_ROCK_HIHAT_CLOSED", "caption": "hihat closed"},
                    {"url": "PRESET_HH_HIHAT", "caption": "hihat open"},
                    {"url": "PRESET_HH_TAMB", "caption": "tambourine"},
                    {"url": "PRESET_HH_TOM_MH", "caption": "h tom"},
                    {"url": "PRESET_HH_TOM_ML", "caption": "m tom"},
                    {"url": "PRESET_HH_TOM_L", "caption": "l tom"}
                ]}};

    }
    if (preset == "PRESET_ROCK") {
        oret = {"name": "PRESET_ROCK", "id": 0,
            "data": {"name": "PRESET_ROCK", "data": [
                    {"url": "PRESET_ROCK_KICK", "caption": "kick"},
                    {"url": "PRESET_ROCK_SNARE", "caption": "snare"},
                    {"url": "PRESET_ROCK_HIHAT_CLOSED", "caption": "hihat closed"},
                    {"url": "PRESET_ROCK_HIHAT_OPEN", "caption": "hihat open"},
                    {"url": "PRESET_ROCK_CRASH", "caption": "crash"},
                    {"url": "PRESET_ROCK_TOM_H", "caption": "h tom"},
                    {"url": "PRESET_ROCK_TOM_ML", "caption": "m tom"},
                    {"url": "PRESET_ROCK_TOM_L", "caption": "l tom"}
                ]}};

    }


    return oret;
};

OMusicPlayer.prototype.playNote = function (note, part) {
    var p = this;
    
    var fromNow = (note.beats * 4 * p.subbeatLength) / 1000;

    if (!note || note.rest) {
        if (part.osc) {
            part.osc.frequency.setValueAtTime(0, p.context.currentTime);
        }
        return;
    }

    if (part.osc) {
        var freq = p.makeFrequency(note.scaledNote) * part.data.audioParameters.warp;
        part.panner.pan.setValueAtTime(part.data.audioParameters.pan, p.context.currentTime);
        part.gain.gain.setValueAtTime(part.data.audioParameters.volume, p.context.currentTime);
        part.osc.frequency.setValueAtTime(freq, p.context.currentTime);
        part.playingI = part.currentI;
        var playingI = part.playingI;
        
        //this should be a timeout so it can be canceled if
        //a different note has played
        setTimeout(function () {
            if (part.osc && part.playingI == playingI) {
                part.osc.frequency.setValueAtTime(0,
                        //p.subbeats * note.beats * p.subbeatLength * 0.85)
                        p.context.currentTime);
            }
        }, p.song.data.beatParameters.subbeats * note.beats * p.subbeatLength * 0.85);
    }
    else {
        var audio = p.playSound(note.sound, part);
        if (audio) {
            audio.bufferGain.gain.linearRampToValueAtTime(part.data.audioParameters.volume, 
                p.context.currentTime + fromNow * 0.995);
            audio.bufferGain.gain.linearRampToValueAtTime(0, p.context.currentTime + fromNow);
            audio.stop(p.context.currentTime + fromNow);
        }
    }
};



OMusicPlayer.prototype.playSound = function (sound, part) {
    var p = this;
    if (p.loadedSounds[sound] &&
            p.loadedSounds[sound] !== "loading") {

        var source = p.context.createBufferSource();
        source.playbackRate.value = part.data.audioParameters.warp;
        source.buffer = p.loadedSounds[sound];
        
        if (!part.bufferPanner) {
            part.bufferPanner = p.context.createStereoPanner();
            part.delay = p.context.createDelay();
            part.feedback = p.context.createGain();

            part.delay.connect(part.feedback);
            part.feedback.connect(part.delay);
            part.feedback.connect(part.bufferPanner);

            part.bufferPanner.connect(p.compressor);
            
            part.delay.delayTime.value = part.data.audioParameters.delayTime || 0;
            part.feedback.gain.value = part.data.audioParameters.delayLevel || 0;
            part.bufferPanner.pan.setValueAtTime(part.data.audioParameters.pan, p.context.currentTime);
        }
        
        source.bufferGain = p.context.createGain();
        source.bufferGain.connect(part.bufferPanner)
        source.bufferGain.connect(part.delay)
        source.connect(source.bufferGain);
        
        part.bufferPanner.pan.setValueAtTime(part.data.audioParameters.pan, p.context.currentTime);
        source.bufferGain.gain.setValueAtTime(part.data.audioParameters.volume, p.context.currentTime);
        
        source.start(p.context.currentTime);

        return source;
    }
};

OMusicPlayer.prototype.getSound = function (soundSet, note) {
    var noteIndex;
    if (soundSet.chromatic) {
        noteIndex = note.scaledNote - soundSet.lowNote;
        if (noteIndex < 0) {
            noteIndex = noteIndex % 12 + 12;
        } else {
            while (noteIndex >= soundSet.data.length) {
                noteIndex = noteIndex - 12;
            }
        }
    }
    else {
        noteIndex = note.note;
    }

    if (!soundSet.data[noteIndex]) {
        return "";
    }

    //kinda hacky place for this
    note.sound = (soundSet.prefix || "") + soundSet.data[noteIndex].url + 
            (soundSet.postfix || "");
    
    return note.sound;
};

OMusicPlayer.prototype.makeOMGSong = function (data) {
    var newSong;
    var newSection;
    var newPart;

    if (!data) {
        return null;
    }

    var className = data.constructor.name;

    if (className == "OMGPart" || className == "OMGDrumpart") {

        newSong = new OMGSong();
        newSection = new OMGSection(null, null, newSong);
        newSection.parts.push(data);
        data.section = newSection;

        //todo this old, doesn't use data.beatParameters
        if (data.data.beats) {
            newSection.data.beats = data.data.beats;
            newSong.data.beats = newSection.data.beats;
        }            
        if (data.data.subbeats) {
            newSection.data.subbeats = data.data.subbeats;
            newSong.data.subbeats = newSection.data.subbeats;
        }   
        if (data.data.measures) {
            newSection.data.measures = data.data.measures;
            newSong.data.measures = newSection.data.measures;
        }   
        if (data.data.subbeatMillis) {
            newSection.data.subbeatMillis = data.data.subbeatMillis;
            newSong.data.subbeatMillis = newSection.data.subbeatMillis;
        }
        return newSong;
    }

    if (className == "OMGSection") {

        //todo needs to use beatParameters and keyParameters
        console.log("loading OMGSection!!")
        newSong = new OMGSong();
        newSong.sections.push(data);
        if (newSection.data.beats)
            newSong.data.beats = newSection.data.beats;
        if (newSection.data.subbeats)
            newSong.data.subbeats = newSection.data.subbeats;
        if (newSection.data.measures)
            newSong.data.measures = newSection.data.measures;
        if (newSection.data.subbeatMillis)
            newSong.data.subbeatMillis = newSection.data.subbeatMillis;
        
        data.song = newSong;
        return newSong;
    }

    if (!data.type) {
        return null;
    }

    var newSong;
    if (data.type == "SONG") {
        newSong = new OMGSong(null, data);
        return newSong;
    }

    if (data.type == "SECTION") {
        //newSong = new OMGSong();
        newSection = new OMGSection(null, data);
        return newSection.song;
    }

    //todo this could go away, we only have type = "PART" now
    //its for back compat with pre-launch data
    if (data.type == "MELODY" || data.type == "BASSLINE"
            || data.partType == "MELODY" || data.partType == "BASSLINE") {
        newPart = new OMGPart(null, data);
    }
    else if (data.type == "DRUMBEAT"
            || data.partType == "DRUMBEAT") {
        newPart = new OMGDrumpart(null, data);
    }
    else if (data.type == "PART") {
        newPart = new OMGPart(null, data);
    }

    if (newPart) {
        return newPart.section.song;
    }

    return null;
};

OMusicPlayer.prototype.updatePartVolumeAndPan = function (part) {

    if (part.gain && part.osc) {
        var oscGain = (part.osc.soft ? 1 : 2) * part.data.volume / 10;
        part.gain.gain.setValueAtTime(oscGain, this.context.currentTime);
    }
    if (part.bufferGain) {
        part.bufferGain.gain.setValueAtTime(part.data.volume, this.context.currentTime);
    }
    if (part.panner) {
        part.panner.pan.setValueAtTime(part.data.pan, this.context.currentTime);
    }

};


OMusicPlayer.prototype.splitInts = function (input) {
    var newInts = [];
    var elements = input.split(",");
    elements.forEach(function (el) {
        newInts.push(parseInt(el));
    });
    return newInts;
};

OMusicPlayer.prototype.getTotalSubbeats = function () {
    return this.beats * this.subbeats * this.measures;
};

OMusicPlayer.prototype.rescaleSong = function (rootNote, ascale, chord) {
    var p = this;
    var song = this.song.data;
    if (rootNote != undefined) {
        song.rootNote = rootNote;
    }
    if (ascale != undefined) {
        song.ascale = ascale;
    }
    this.song.sections.forEach(function (section) {
        section.parts.forEach(function (part) {
            p.rescale(part, song.keyParameters,
                    chord || 0);
        });
    });
};

OMusicPlayer.prototype.setSubbeatMillis = function (subbeatMillis) {
    this.newSubbeatMillis = subbeatMillis;
};

OMusicPlayer.prototype.playLiveNotes = function (notes, part) {
    
    if (part.liveNotes && part.liveNotes.liveAudio) {
            part.liveNotes.liveAudio.bufferGain.gain.setTargetAtTime(0, this.context.currentTime, 0.001);
            part.liveNotes.liveAudio.stop(this.context.currentTime + 0.015);
    }
    
    part.liveNotes = notes;
    if (notes.autobeat === 0 || !this.playing) {
        if (part.data.soundSet.url.startsWith("PRESET_OSC")) {
            if (!part.osc)
                this.makeOsc(part);
            if (part.osc) {
                part.osc.frequency.setValueAtTime(this
                        .makeFrequency(notes[0].scaledNote) * part.data.audioParameters.warp, this.context.currentTime);
            }
        }
        else {
            //var sound = this.getSound(part.data.soundSet, notes[0]);
            notes[0].sound = this.getSound(part.soundSet, notes[0]);
            part.liveNotes.liveAudio = this.playSound(notes[0].sound, part);
        }
    }
    if (this.playing && !part.data.audioParameters.mute && notes.autobeat === 0) {
        this.recordNote(part, notes[0]);
    }
};

OMusicPlayer.prototype.endLiveNotes = function (part) {
  
    if (part.osc) {
        part.osc.frequency.setValueAtTime(0,
                this.context.currentTime);
    }  
    else {
        if (part.liveNotes && part.liveNotes.liveAudio) {
            part.liveNotes.liveAudio.bufferGain.gain.setTargetAtTime(0, this.context.currentTime, 0.001);
            part.liveNotes.liveAudio.stop(this.context.currentTime + 0.015);
        }
    }
    part.liveNotes = [];
    
    part.nextBeat = 0;
    part.currentI = -1;
    for (var i = 0; i < part.data.notes.length; i++) {
        if (part.nextBeat < this.iSubBeat) {
            part.nextBeat += part.data.notes[i].beats * this.song.data.beatParameters.subbeats;
            part.currentI = i + 1;
        }       
    }
    console.log('nextbeat')
    console.log(part.nextBeat);
};

OMusicPlayer.prototype.recordNote = function (part, note) {

    var beatsUsed = 0;
    var currentBeat = this.iSubBeat / part.section.song.data.beatParameters.subbeats;
    var index = -1;
    for (var i = 0; i < part.data.notes.length; i++) {
        if (currentBeat === beatsUsed) {
            index = i;
            break;
        }
        if (beatsUsed > currentBeat) {
            part.data.notes[i - 1].beats -= beatsUsed - currentBeat;
            index = i;
            break;
        } 
        beatsUsed += part.data.notes[i].beats;
    }
    if (index > -1) {
        part.data.notes.splice(index, 0, note);
        if (beatsUsed - currentBeat > note.beats) {
            part.data.notes.splice(index + 1, 0, {rest:true, beats: beatsUsed - currentBeat - note.beats});
        }
        else if (beatsUsed - currentBeat < note.beats) {
            beatsUsed = note.beats;
            while (part.data.notes[index + 1] && beatsUsed > 0) {
                if (part.data.notes[index + 1].beats > beatsUsed) {
                    part.data.notes[index + 1].beats -= beatsUsed;
                    part.data.notes[index + 1].rest = true;
                    break;
                }
                else {
                    beatsUsed -= part.data.notes[index + 1].beats;
                    part.data.notes.splice(index + 1, 1);
                }
            }
        }
    }
    else {
        var newBeats;
        //add quarter note rests to take up needed space
        while (currentBeat > beatsUsed) {
            newBeats = Math.min(1, currentBeat - beatsUsed);
            part.data.notes.push({rest:true, beats: newBeats});
            beatsUsed += newBeats;
        }
        part.data.notes.push(note);
    }
};


function OMGSong(div, data, headerOnly) {
    this.div = div;
    this.sections = [];
    this.loop = true;

    if (headerOnly) {
        this.setHeaderData(data);
    } else if (data) {
        this.setData(data);
        if (data.id) {
            this.saved = true;
        }
    } else {
        data = {type: "SONG", name: ""};
        this.data = data;
    }

    //backwards compatibility
    if (!data.beatParameters) {
        data.beatParameters = {"beats": data.beats || 4, 
                    "subbeats": data.subbeats || 4,
                    "measures": data.measures || 1, 
                    "shuffle": data.shuffle || 0, 
                    "subbeatMillis": data.subbeatMillis || 125
                };
    }
    if (!data.keyParameters) {
        data.keyParameters = {"rootNote": data.rootNote || 0, 
                    "scale": data.ascale 
                            || (data.scale ? data.scale.split(",") : 0) 
                            || [0,2,4,5,7,9,11]};
    }
    
    if (!data.beatParameters.bpm && data.beatParameters.subbeatMillis) {
        data.beatParameters.bpm = 1 / data.beatParameters.subbeatMillis * 60000 / 4;
    }
};

OMGSong.prototype.setData = function (data) {
    this.data = data;

    for (var i = 0; i < data.sections.length; i++) {
        var ooo = new OMGSection(null, data.sections[i], this);
    }

    if (!this.data.name)
        this.data.name = "";
};

OMGSong.prototype.getData = function () {

    this.data.sections = [];
    for (var ip = 0; ip < this.sections.length; ip++) {
        this.data.sections[ip] = this.sections[ip].getData();
    }
    return this.data;
};

function OMGSection(div, data, song) {
    var partData;
    var part;

    this.div = div;
    this.parts = [];

    //backwards compatibility
    //with technogauntlet and omg < 0.9
    if (data) {
        if (data.beats && !data.beatParameters) {
            data.beatParameters = {"beats": data.beats, "subbeats": data.subbeats,
                        "measures": data.measures || 1, "shuffle": data.shuffle || 0,
                        "subbeatMillis": data.subbeatMillis || 125,
                    };
        }
        if (data.rootNote && !data.keyParameters) {
            data.keyParameters = {"rootNote": data.rootNote, 
                        "scale": data.ascale || data.scale.split(",")};
        }
    }

    //if there is no song, but the section has key and beat parameters
    //make a song with those parameters
    if (data && (!song || !song.data)) {
        song = new OMGSong();
        if (data.beatParameters) {
            if (data.beatParameters.beats) {
                song.data.beatParameters.beats = data.beatParameters.beats;
            }
            if (data.beatParameters.subbeats) {
                song.data.beatParameters.subbeats = data.beatParameters.subbeats;
            }
            if (data.beatParameters.measures) {
                song.data.beatParameters.measures = data.beatParameters.measures;
            }
            if (data.beatParameters.subbeatMillis) {
                song.data.beatParameters.subbeatMillis = data.beatParameters.subbeatMillis;
            }
        }
        if (data.keyParameters) {
            if (typeof data.keyParameters.rootNote === "number") {
                song.data.keyParameters.rootNote = data.keyParameters.rootNote;
            }
            if (data.keyParameters.scale) {
                song.data.keyParameters.scale = data.keyParameters.scale;
            }
        }
    }
    this.song = song;
    this.position = song.sections.length;
    song.sections.push(this);        

    if (data) {
        this.data = data;
        if (data.id) {
            this.saved = true;
        }
    } else {
        this.data = {type: "SECTION", parts: []};
    }

    for (var ip = 0; ip < this.data.parts.length; ip++) {
        partData = this.data.parts[ip];
        if (partData.type == "DRUMBEAT" ||
                partData.partType == "DRUMBEAT") {
            part = new OMGDrumpart(null, partData, this);
        } else {
            part = new OMGPart(null, partData, this);
        }
    }
}

OMGSection.prototype.getData = function () {
    this.data.parts = [];
    for (var ip = 0; ip < this.parts.length; ip++) {
        this.data.parts[ip] = this.parts[ip].data;
    }
    return this.data;
};

function OMGDrumpart(div, data, section) {
    this.div = div;
    if (!section || !section.data) {
        console.log("new OMGDrumpart() called without a section. Not good.");
        try {throw new Exception();}
        catch (e) {console.log(e);}
        var song = new OMGSong();
        section = new OMGSection(null, null, song);
    }

    this.section = section;
    this.position = section.parts.length;
    section.parts.push(this);        
    
    if (!section.song || !section.song.data) {
        section.song = new OMGSong();
        section.song.sections.push(section.song);        
    }
    
    if (data) {
        this.data = data;
        if (!data.partType) {
            data.partType = "DRUMBEAT";
            data.type = "PART";
        }
        if (data.id) {
            this.saved = true;
        }
    } else {
        this.data = {"type": "PART", "partType": "DRUMBEAT",
            "surfaceURL": "PRESET_SEQUENCER",
            "soundsetURL": "PRESET_HIPKIT", "soundsetName": "Hip Hop Drum Kit",
            "bpm": 120, "kit": 0,
            isNew: true,
            "tracks": [{"name": "kick", "sound": "PRESET_HH_KICK",
                    "data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                {"name": "snare", "sound": "PRESET_HH_CLAP",
                    "data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                {"name": "closed hi-hat", "sound": "PRESET_ROCK_HIHAT_CLOSED",
                    "data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                {"name": "open hi-hat", "sound": "PRESET_HH_HIHAT",
                    "data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                {"name": "tambourine", "sound": "PRESET_HH_TAMB",
                    "data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                {"name": "h tom", "sound": "PRESET_HH_TOM_MH",
                    "data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                {"name": "m tom", "sound": "PRESET_HH_TOM_ML",
                    "data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                {"name": "l tom", "sound": "PRESET_HH_TOM_L",
                    "data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
            ]};
    }
    
}

function OMGPart(div, data, section) {
    this.div = div;
    if (!section || !section.data) {
        console.log("new OMGPart() called without a section. Not good.");
        try {throw new Exception();}
        catch (e) {console.log(e);}
        var song = new OMGSong();
        section = new OMGSection(null, null, song);
    }

    this.section = section;
    this.position = section.parts.length;
    section.parts.push(this);        

    if (!section.song || !section.song.data) {
        section.song = new OMGSong();
        section.song.sections.push(section.song);
    }

    this.data = data || {};

    if (!this.data.partType) {
        //if type is melody or bassline
        data.partType = data.type;
        data.type = "PART";
    }
    if (!this.data.surface) {
        if (this.data.soundSet && this.data.soundSet.defaultSurface) {
            this.data.surface = {url: this.data.soundSet.defaultSurface};
        }
        else {
            this.data.surface = {url: this.data.surfaceURL || "PRESET_VERTICAL"};
        }
    }
    if (this.data.surface.url === "PRESET_VERTICAL") {
        if (!this.data.notes) {
            this.data.notes = [];
        }     
    }
    else {
        if (!this.data.tracks) {
            this.data.tracks = [];
            if (this.data.soundSet && this.data.soundSet.data) {
                var that = this;
                this.data.soundSet.data.forEach(function (sound) {
                    that.data.tracks.push(sound);
                    sound.sound = (that.data.soundSet.prefix || "") +
                            sound.url + (that.data.soundSet.postFix || "");
                    sound.data = [];
                });
            }
        }
    }
    if (!this.data.audioParameters) this.data.audioParameters = {};
    if (typeof this.data.audioParameters.volume !== "number")
        this.data.audioParameters.volume = 0.6;
    if (typeof this.data.audioParameters.pan !== "number")
        this.data.audioParameters.pan = 0;
    if (typeof this.data.audioParameters.warp !== "number")
        this.data.audioParameters.warp = 1;

    if (this.data.id) {
        this.saved = true;
    }
    
}
