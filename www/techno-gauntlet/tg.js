
var tg = {};
tg.playButton = document.getElementById("play-button");
tg.beatsButton = document.getElementById("beats-button");
tg.keyButton = document.getElementById("key-button");
tg.chordsButton = document.getElementById("chords-button");
tg.mixButton = document.getElementById("mix-button");
tg.saveButton = document.getElementById("save-button");
tg.addPartButton = document.getElementById("add-part-button");
tg.partList = document.getElementById("part-list");
tg.detailFragment = document.getElementById("detail-fragment");


tg.sequencer = {
    div: document.getElementById("sequencer-fragment"),
    fullStrengthButton: document.getElementById("sequencer-beat-strength-loud"),
    mediumStrengthButton: document.getElementById("sequencer-beat-strength-medium"),
    softStrengthButton: document.getElementById("sequencer-beat-strength-soft"),
    canvas: document.getElementById("sequencer-canvas")
};

tg.sequencer.setup = function () {
    var s = tg.sequencer;
    s.currentStrength = s.fullStrengthButton;
    s.currentStrength.classList.add("sequencer-toolbar-beat-strength-selected");
    
    s.fullStrengthButton.onclick = function (e) {
        s.currentStrength.classList.remove("sequencer-toolbar-beat-strength-selected");
        e.target.classList.add("sequencer-toolbar-beat-strength-selected");
        s.currentStrength = e.target;
        s.drumMachine.beatStrength = 1;
    };
    s.mediumStrengthButton.onclick = function (e) {
        s.currentStrength.classList.remove("sequencer-toolbar-beat-strength-selected");
        e.target.classList.add("sequencer-toolbar-beat-strength-selected");
        s.currentStrength = e.target;
        s.drumMachine.beatStrength = 0.50;
    };
    s.softStrengthButton.onclick = function (e) {
        s.currentStrength.classList.remove("sequencer-toolbar-beat-strength-selected");
        e.target.classList.add("sequencer-toolbar-beat-strength-selected");
        s.currentStrength = e.target;
        s.drumMachine.beatStrength = 0.25;
    };
    
    s.onBeatPlayedListener = function (isubbeat, isection) {
        s.drumMachine.draw(isubbeat);
    };
};
tg.sequencer.setup();

tg.sequencer.show = function (omgpart) {
    var s = tg.sequencer;
    
    var beatStrength = 1;
    if (s.drumMachine) {
        beatStrength = s.drumMachine.beatStrength;
    }
    
    s.drumMachine = new OMGDrumMachine(s.canvas, omgpart);
    s.drumMachine.captionWidth = window.innerWidth / 2 / 8;
    s.drumMachine.readOnly = false;
    s.drumMachine.beatStrength = beatStrength;
    
    tg.player.onBeatPlayedListeners.push(s.onBeatPlayedListener);
    
    tg.hideDetails();
    s.div.style.display = "flex";
    s.drumMachine.draw();
    tg.currentFragment = tg.sequencer;
};

tg.sequencer.onhide = function () {
    var index = tg.player.onBeatPlayedListeners.indexOf(this.onBeatPlayedListener);
    tg.player.onBeatPlayedListeners.splice(index, 1);
};

tg.instrument = {
    div: document.getElementById("instrument-fragment"),
    editButton: document.getElementById("instrument-edit-button"),
    zoomButton: document.getElementById("instrument-zoom-button"),
    canvas: document.getElementById("instrument-canvas")
};

tg.instrument.setMode = function (mode) {
    if (mode === "EDIT") {
        this.editButton.classList.add("selected-option");
    }
    else {
        this.editButton.classList.remove("selected-option");
    }
    if (mode === "ZOOM") {
        this.zoomButton.classList.add("selected-option");
    }
    else {
        this.zoomButton.classList.remove("selected-option");
    }
    
    this.mm.mode = mode;
    this.mm.draw();
};

tg.instrument.setup = function () {
    var ti = tg.instrument;
    ti.editButton.onclick = function (e) {
        if (ti.mm.mode === "EDIT") {
            e.target.classList.add("selected-option");
            ti.currentMode = e.target;
        }
    };
    
    this.editButton.onclick = function () {
        ti.setMode(ti.mm.mode !== "EDIT" ? "EDIT" : "LIVE");
    };
    this.zoomButton.onclick = function () {
        ti.setMode(ti.mm.mode !== "ZOOM" ? "ZOOM" : "LIVE");
    };
    
    tg.instrument.onBeatPlayedListener = function (isubbeat, isection) {
        tg.instrument.mm.draw(isubbeat);
    };
};
tg.instrument.setup();

tg.instrument.show = function (omgpart) {
    tg.instrument.div.style.display = "flex";

    tg.instrument.mm = new OMGMelodyMaker(tg.instrument.canvas, omgpart, tg.player);
    tg.player.onBeatPlayedListeners.push(tg.instrument.onBeatPlayedListener);

    tg.currentFragment = tg.sequencer;
    tg.instrument.mm.draw();
    tg.instrument.setMode("WRITE");
};

tg.instrument.onhide = function () {
    var index = tg.player.onBeatPlayedListeners.indexOf(this.onBeatPlayedListener);
    tg.player.onBeatPlayedListeners.splice(index, 1);
};


tg.chordsEditorView = document.getElementById("chords-fragment-chords-view");

tg.sectionCaptionDiv = document.getElementById("tool-bar-section-button");

tg.player = new OMusicPlayer();

tg.getSong = function (callback) {
    
    var id = omg.util.getPageParams().id;
    if (!id) {
        var defaultSong = {
            "name":"default","type":"SONG","sections":[
                {"type":"SECTION","name": "Intro", "parts":[
                        {"type":"PART","notes":[
                                {"note":-4,"beats":1,"scaledNote":62},{"note":-3,"beats":1,"scaledNote":64},{"note":-2,"beats":1,"scaledNote":65},{"note":-1,"beats":1,"scaledNote":67}
                            ],
                            "surface":{"url":"PRESET_VERTICAL"},"partType":"PART",
                            "soundSet":{"url":"PRESET_OSC_SINE","name":"Sine Oscillator","type":"SOUNDSET","octave":5,"lowNote":0,"highNote":108,"chromatic":true},
                            "audioParameters":{"pan":-0.5654761904761905,"warp":1,"volume":0.18825301204819278,"delayTime":0.3187702265372168,"delayLevel":0.45307443365695793}},
                        {"type":"PART","tracks":[
                                {"url":"hh_kick","data":[true,null,null,null,true,null,null,null,true,null,null,null,true],"name":"Kick","sound":"http://mikehelland.com/omg/drums/hh_kick.mp3"},{"url":"hh_clap","data":[null,null,null,null,true,null,null,null,null,null,null,null,true],"name":"Clap","sound":"http://mikehelland.com/omg/drums/hh_clap.mp3"},{"url":"rock_hihat_closed","data":[true,null,true,null,true,null,true,null,true,null,true,null,true,null,true],"name":"HiHat Closed","sound":"http://mikehelland.com/omg/drums/rock_hihat_closed.mp3"},{"url":"hh_hihat","data":[null,null,null,null,null,null,false,null,null,null,null,null,null,null,false],"name":"HiHat Open","sound":"http://mikehelland.com/omg/drums/hh_hihat.mp3"},{"url":"hh_tamb","data":[],"name":"Tambourine","sound":"http://mikehelland.com/omg/drums/hh_tamb.mp3"},{"url":"hh_tom_mh","data":[null,null,null,null,null,null,null,null,false,null,null,false,true,false],"name":"Tom H","sound":"http://mikehelland.com/omg/drums/hh_tom_mh.mp3"},{"url":"hh_tom_ml","data":[null,null,null,null,null,null,null,null,null,null,true],"name":"Tom M","sound":"http://mikehelland.com/omg/drums/hh_tom_ml.mp3"},{"url":"hh_tom_l","data":[null,null,null,null,null,null,null,null,null,null,null,null,null,null,true,false],"name":"Tom L","sound":"http://mikehelland.com/omg/drums/hh_tom_l.mp3"}],"surface":{"url":"PRESET_SEQUENCER"},"soundSet":{"id":1207,"url":"http://openmusic.gallery/data/1207","data":[{"url":"hh_kick","data":[true,null,null,null,true,null,null,null,true,null,null,null,true],"name":"Kick","sound":"http://mikehelland.com/omg/drums/hh_kick.mp3"},{"url":"hh_clap","data":[null,null,null,null,true,null,null,null,null,null,null,null,true],"name":"Clap","sound":"http://mikehelland.com/omg/drums/hh_clap.mp3"},{"url":"rock_hihat_closed","data":[true,null,true,null,true,null,true,null,true,null,true,null,true,null,true],"name":"HiHat Closed","sound":"http://mikehelland.com/omg/drums/rock_hihat_closed.mp3"},{"url":"hh_hihat","data":[null,null,null,null,null,null,false,null,null,null,null,null,null,null,false],"name":"HiHat Open","sound":"http://mikehelland.com/omg/drums/hh_hihat.mp3"},{"url":"hh_tamb","data":[],"name":"Tambourine","sound":"http://mikehelland.com/omg/drums/hh_tamb.mp3"},{"url":"hh_tom_mh","data":[null,null,null,null,null,null,null,null,false,null,null,false,true,false],"name":"Tom H","sound":"http://mikehelland.com/omg/drums/hh_tom_mh.mp3"},{"url":"hh_tom_ml","data":[null,null,null,null,null,null,null,null,null,null,true],"name":"Tom M","sound":"http://mikehelland.com/omg/drums/hh_tom_ml.mp3"},{"url":"hh_tom_l","data":[null,null,null,null,null,null,null,null,null,null,null,null,null,null,true,false],"name":"Tom L","sound":"http://mikehelland.com/omg/drums/hh_tom_l.mp3"}],"name":"Hip Kit","type":"SOUNDSET","prefix":"http://mikehelland.com/omg/drums/","lowNote":72,"postfix":".mp3","user_id":"1","approved":true,"username":"m                   ","chromatic":false,"created_at":1542271035794,"last_modified":1542271055684,"defaultSurface":"PRESET_SEQUENCER"},"audioParameters":{"pan":0,"warp":1,"volume":0.6,"delayTime":0.09870550161812297,"delayLevel":0.12297734627831715}}],"chordProgression":[0]}],
            "keyParameters":{"scale":[0,2,3,5,7,8,10],"rootNote":9},
            "beatParameters":{"bpm":"108","beats":4,"shuffle":0,"measures":1,"subbeats":4}
        };
        callback(defaultSong);
    }    
    else {
        omg.server.getId(id, function (response) {
            callback(response);
        });
    }
};

tg.loadSong = function (songData) {
    tg.song = tg.player.makeOMGSong(songData);
    tg.player.prepareSong(tg.song);    
    
    tg.loadSection(tg.song.sections[0])
    
    tg.setSongControlsUI();
    document.getElementById("tool-bar-song-button").innerHTML = tg.song.data.name || "(Untitled)";

    tg.drawPlayButton();
};

tg.playButton.onclick = function () {
    if (tg.player.playing) {
        tg.player.stop();
    }
    else {
        tg.player.play(tg.song);
    }
};

tg.player.onPlay = function () {
    tg.drawPlayButton(0);
};
tg.player.onStop = function () {
    tg.drawPlayButton();
    var chordsCaption = tg.makeChordsCaption();
    tg.chordsButton.innerHTML = chordsCaption;
    tg.chordsEditorView.innerHTML = chordsCaption;
};

tg.setSongControlsUI = function () {
    tg.keyButton.innerHTML = omg.ui.getKeyCaption(tg.song.data.keyParameters);
    tg.beatsButton.innerHTML = tg.song.data.beatParameters.bpm + " bpm";
    var chordsCaption = tg.makeChordsCaption();
    tg.chordsButton.innerHTML = chordsCaption;
    tg.chordsEditorView.innerHTML = chordsCaption;
    
    tg.sectionCaptionDiv.innerHTML = tg.currentSection.data.name || "(Untitled)";
};

tg.setupPartButton = function (omgpart) {
    partDiv = document.createElement("div");
    partDiv.className = "part";
    
    var button;
    button = document.createElement("div");
    button.className = "part-options-button";
    button.innerHTML = "&#9776;";
    partDiv.appendChild(button);
    button.onclick = function (e) {
        tg.showPartOptionsFragment(omgpart);
        tg.newChosenButton(e.target);
    }
    
    var bigbutton = document.createElement("div");
    bigbutton.className = "part-button";
    bigbutton.innerHTML = omgpart.data.soundSet.name;
    bigbutton.onclick = function (e) {
        tg.hideDetails();
        if (omgpart.data.surface.url === "PRESET_SEQUENCER") {
            tg.sequencer.show(omgpart);            
        }
        else if (omgpart.data.surface.url === "PRESET_VERTICAL") {
            tg.instrument.show(omgpart);
            //tg.showSurface();
            //tg.showMelodyEditor(omgpart);
        }
        tg.newChosenButton(bigbutton);
    };
    partDiv.appendChild(bigbutton);
    
    button = document.createElement("div");
    button.className = "part-mute-button";
    button.innerHTML = "M";
    button.onclick = function () {
        omgpart.data.audioParameters.mute = !omgpart.data.audioParameters.mute;
        button.style.backgroundColor = omgpart.data.audioParameters.mute ? "#800000" : "#008000";
    }
    button.style.backgroundColor = omgpart.data.audioParameters.mute ?
        "#800000" : "#008000";
    partDiv.appendChild(button);
    tg.partList.appendChild(partDiv);
    return partDiv;
}

tg.playButton.width = tg.playButton.clientWidth
tg.playButton.height = tg.playButton.clientHeight
tg.drawPlayButton = function (subbeat) {
    tg.playButton.width = tg.playButton.width;
    var context = tg.playButton.getContext("2d");

    if (!tg.song) {
        context.fillStyle = "white";
        context.font = "bold 30px sans-serif";
        var caption = "LOADING...";
        var measures = context.measureText(caption);
        context.fillText(caption, tg.playButton.width / 2 - measures.width / 2, 
                        tg.playButton.height / 2 - measures.height / 2);
        return;
    }
    
    context.globalAlpha = 0.6;

    var beatWidth = tg.playButton.width / 
        (tg.song.data.beatParameters.measures * tg.song.data.beatParameters.beats);

    if (tg.player.playing) {
        context.fillStyle = "#00FF00";
        context.fillRect(beatWidth * Math.floor(subbeat / tg.song.data.beatParameters.subbeats), 
            0, beatWidth, tg.playButton.height);        
    }
    else {
        context.fillStyle = "#FF0000";
        context.fillRect(0, 0, tg.playButton.width, tg.playButton.height);        
    }

    context.fillStyle = "white";
    context.strokeStyle = "white";
    context.strokeRect(0, 0, tg.playButton.width, tg.playButton.height);
    for (var beat = 1; 
            beat <= tg.song.data.beatParameters.beats * tg.song.data.beatParameters.measures; 
            beat++) {
        context.fillRect(beat * beatWidth, 0, 
                    beat % tg.song.data.beatParameters.beats == 0 ? 2 : 1, 
                    tg.playButton.height);
    }
    context.globalAlpha = 1.0;    
    
    context.font = "bold 30px sans-serif";
    var caption = tg.player.playing ? "STOP" : "PLAY";
    measures = context.measureText(caption);
    context.fillText(caption, tg.playButton.width / 2 - measures.width / 2, 
                        tg.playButton.height / 2 + 10);
                        
    //context.font = "bold 10px sans-serif";
    //context.fillText(tg.player.latencyMonitor, 10, tg.playButton.height / 2 + 10);

};
tg.player.onBeatPlayedListeners.push(function (isubbeat, isection) {
    tg.drawPlayButton(isubbeat);
    if (isubbeat === 0) {
        var chordsCaption = tg.makeChordsCaption();
        tg.chordsButton.innerHTML = chordsCaption;
        tg.chordsEditorView.innerHTML = chordsCaption;   
    }
});
tg.drawPlayButton();

tg.showBeatsFragment = function () {
    tg.hideDetails();
    if (!tg.beatsFragment) {
        tg.beatsFragment = document.getElementById("beats-fragment");
        var bf= tg.beatsFragment;
        bf.subbeatsLabel = document.getElementById("subbeats-label");
        bf.beatsLabel = document.getElementById("beats-label");
        bf.measuresLabel = document.getElementById("measures-label");
        bf.bpmLabel = document.getElementById("bpm-label");
        bf.shuffleLabel = document.getElementById("shuffle-label");
        
        bf.subbeatsRange = document.getElementById("subbeats-range");
        bf.beatsRange = document.getElementById("beats-range");
        bf.measuresRange = document.getElementById("measures-range");
        bf.bpmRange = document.getElementById("bpm-range");
        bf.shuffleRange = document.getElementById("shuffle-range");
        
        var onSubeatsChange = function (e) {
            bf.subbeatsLabel.innerHTML = bf.subbeatsRange.value;
            tg.song.data.beatParameters.subbeats = bf.subbeatsRange.value;
        };
        bf.subbeatsRange.ontouchmove = onSubeatsChange;
        bf.subbeatsRange.onmousemove = onSubeatsChange;
        bf.subbeatsRange.onmousedown = onSubeatsChange;
        bf.subbeatsRange.onchange = onSubeatsChange;
        var onBeatsChange = function (e) {
            bf.beatsLabel.innerHTML = bf.beatsRange.value;
            tg.song.data.beatParameters.beats = bf.beatsRange.value;
        };
        bf.beatsRange.ontouchmove = onBeatsChange;
        bf.beatsRange.onmousemove = onBeatsChange;
        bf.beatsRange.onmousedown = onBeatsChange;
        bf.beatsRange.onchange = onBeatsChange;
        var onMeasuresChange = function (e) {
            bf.measuresLabel.innerHTML = bf.measuresRange.value;
            tg.song.data.beatParameters.measures = bf.measuresRange.value;
        };
        bf.measuresRange.ontouchmove = onMeasuresChange;
        bf.measuresRange.onmousemove = onMeasuresChange;
        bf.measuresRange.onmousedown = onMeasuresChange;
        bf.measuresRange.onchange = onMeasuresChange;
        var onBpmChange = function (e) {
            bf.bpmLabel.innerHTML = bf.bpmRange.value;
            tg.song.data.beatParameters.bpm = bf.bpmRange.value;
            tg.player.newBPM = bf.bpmRange.value;
            tg.setSongControlsUI();
        };
        bf.bpmRange.ontouchmove = onBpmChange;
        bf.bpmRange.onmousemove = onBpmChange;
        bf.bpmRange.onmousedown = onBpmChange;
        bf.bpmRange.onchange = onBpmChange;
        var onShuffleChange = function (e) {
            bf.shuffleLabel.innerHTML = bf.shuffleRange.value;
            tg.song.data.beatParameters.shuffle = bf.shuffleRange.value;
        };
        bf.shuffleRange.ontouchmove = onShuffleChange;
        bf.shuffleRange.onmousemove = onShuffleChange;
        bf.shuffleRange.onmousedown = onShuffleChange;
        bf.shuffleRange.onchange = onShuffleChange;
    }
    tg.refreshBeatsFragment();
    tg.beatsFragment.style.display = "block";
    tg.newChosenButton(tg.beatsButton);
};

tg.refreshBeatsFragment = function () {
    tg.beatsFragment.subbeatsLabel.innerHTML = tg.song.data.beatParameters.subbeats;
    tg.beatsFragment.beatsLabel.innerHTML = tg.song.data.beatParameters.beats;
    tg.beatsFragment.measuresLabel.innerHTML = tg.song.data.beatParameters.measures;
    tg.beatsFragment.bpmLabel.innerHTML = tg.song.data.beatParameters.bpm;
    tg.beatsFragment.shuffleLabel.innerHTML = tg.song.data.beatParameters.shuffle;
    tg.beatsFragment.subbeatsRange.value = tg.song.data.beatParameters.subbeats;
    tg.beatsFragment.beatsRange.value = tg.song.data.beatParameters.beats;
    tg.beatsFragment.measuresRange.value = tg.song.data.beatParameters.measures;
    tg.beatsFragment.bpmRange.value = tg.song.data.beatParameters.bpm;
    tg.beatsFragment.shuffleRange.value = tg.song.data.beatParameters.shuffle;

};

tg.beatsButton.onclick = function () {
    tg.hideDetails();
    tg.showBeatsFragment();
};
tg.keyButton.onclick = function () {
    tg.hideDetails();
    tg.showKeyFragment();
}

tg.chordsButton.onclick = function () {
    tg.hideDetails();
    tg.showChordsFragment();
};
tg.addPartButton.onclick = function() {
    tg.hideDetails();
    tg.showAddPartFragment();
};
tg.mixButton.onclick = function () {
    tg.showMixFragment();
};
tg.saveButton.onclick = function () {
    tg.showSaveFragment();
};

tg.showSurface = function () {
    tg.hideDetails();
    tg.surface.style.display = "block";
    tg.surface.width = tg.surface.clientWidth;
    tg.surface.height = tg.surface.clientHeight;
};

tg.showKeyFragment = function () {
    var kf;
    if (!tg.keyFragment) {
        tg.keyFragment = document.getElementById("key-fragment");
        tg.keyFragment.keyList = document.getElementById("key-list");
        tg.keyFragment.scaleList = document.getElementById("scale-list");
    }
    
    var lastKey;
    var lastScale;
    
    kf = tg.keyFragment;
    kf.keyList.innerHTML = "";
    kf.scaleList.innerHTML = "";
    var keyI = 0;
    omg.ui.keys.forEach(function (key) {
        var keyDiv = document.createElement("div");
        keyDiv.className = "key-select-button";
        if (keyI === tg.song.data.keyParameters.rootNote) {
            keyDiv.classList.add("selected-list-item");
            lastKey = keyDiv;
        }
        keyDiv.innerHTML = "<p>" + key + "</p>";;
        keyDiv.onclick = (function (i) {
            return function () {
                tg.song.data.keyParameters.rootNote = i;
                tg.setSongControlsUI();
                
                if (lastKey) {
                    lastKey.classList.remove("selected-list-item");
                }
                lastKey = keyDiv;
                keyDiv.classList.add("selected-list-item");
            }
        }(keyI));

        kf.keyList.appendChild(keyDiv);
        keyI++;
    });
    omg.ui.scales.forEach(function (scale) {
        var scaleDiv = document.createElement("div");
        scaleDiv.className = "scale-select-button";
        if (scale.value.join() === tg.song.data.keyParameters.scale.join()) {
            scaleDiv.classList.add("selected-list-item");
            lastScale = scaleDiv;
        }
        scaleDiv.innerHTML = "<p>" + scale.name + "</p>";
        scaleDiv.onclick = (function (newScale) {
            return function () {
                tg.song.data.keyParameters.scale = newScale;
                tg.setSongControlsUI();
                if (lastScale) {
                    lastScale.classList.remove("selected-list-item");
                }
                lastScale = scaleDiv;
                scaleDiv.classList.add("selected-list-item");

            }
        }(scale.value));

        kf.scaleList.appendChild(scaleDiv);
    });

    tg.keyFragment.style.display = "flex";
    tg.newChosenButton(tg.keyButton);
};

tg.showChordsFragment = function () {
    if (!tg.chordsFragment) {
        tg.chordsFragment = document.getElementById("chords-fragment");
        tg.chordsFragment.appendMode = false;
        document.getElementById("chords-fragment-clear-button").onclick = function () {
            tg.currentSection.data.chordProgression = [0];
            tg.setSongControlsUI();
        };
        var appendButton = document.getElementById("chords-fragment-append-button");
        appendButton.onclick = function () {
            tg.chordsFragment.appendMode = !tg.chordsFragment.appendMode;
            if (tg.chordsFragment.appendMode) {
                appendButton.classList.add("selected-option");
            }
            else {
                appendButton.classList.remove("selected-option");
            }
        };

    }
    var chordsList = document.getElementById("chords-fragment-list");
    chordsList.innerHTML = "";
    for (var i = tg.song.data.keyParameters.scale.length - 1; i >= 0; i--) {
        chordsList.appendChild(tg.makeChordButton(i));
    }
    for (var i = 1; i < tg.song.data.keyParameters.scale.length; i++) {
        chordsList.appendChild(tg.makeChordButton(i * -1));
    }

    tg.chordsFragment.style.display = "flex";
    tg.newChosenButton(tg.chordsButton);
};

tg.makeChordButton = function (chordI) {
    var chordDiv = document.createElement("div");
    chordDiv.className = "chord-select-button";
    chordDiv.innerHTML = "<p>" + tg.makeChordCaption(chordI) + "</p>";
    chordDiv.onclick = function () {
        if (tg.chordsFragment.appendMode) {
            tg.currentSection.data.chordProgression.push(chordI);
        }
        else {
            tg.currentSection.data.chordProgression = [chordI];
        }
        tg.setSongControlsUI();
    };
    return chordDiv;
};

tg.makeChordsCaption = function (chordI) {
    var chordsCaption = "";
    tg.currentSection.data.chordProgression.forEach(function (chordI, i) {
        if (tg.player.playing && i === tg.player.currentChordI) {
            chordsCaption += "<span class='current-chord'>";
        }
        chordsCaption += tg.makeChordCaption(chordI);
        if (tg.player.playing && i === tg.player.currentChordI) {
            chordsCaption += "</span>";
        }
        chordsCaption += " "
    });
    return chordsCaption;
};
tg.makeChordCaption = function (chordI) {
    var index = chordI < 0 ? tg.song.data.keyParameters.scale.length + chordI : chordI;
    var chord = tg.song.data.keyParameters.scale[index];
    var sign = chordI < 0 ? "-" : "";
    if (chord === 0) return sign + "I";
    if (chord === 2) return sign + "II";
    if (chord === 3 || chord === 4) return sign + "III";
    if (chord === 5) return sign + "IV";
    if (chord === 6) return sign + "Vb";
    if (chord === 7) return sign + "V";
    if (chord === 8 || chord === 9) return sign + "VI";
    if (chord === 10 || chord === 11) return sign + "VII";
    return sign + "?";
}

tg.showAddPartFragment = function () {
    if (!tg.addPartFragment) {
        tg.addPartFragment = document.getElementById("add-part-fragment");
        tg.soundSetList = document.getElementById("add-part-soundset-list");
        tg.setupAddPartTabs();
  
        var addOscButtonClick = function (e) {
          tg.addOsc(e.target.innerHTML);  
        };
        document.getElementById("add-sine-osc-button").onclick = addOscButtonClick;
        document.getElementById("add-saw-osc-button").onclick = addOscButtonClick;
        document.getElementById("add-square-osc-button").onclick = addOscButtonClick;
        document.getElementById("add-triangle-osc-button").onclick = addOscButtonClick;
        
        fetch(location.origin + "/data/?type=SOUNDSET").then(function (e) {return e.json();}).then(function (json) {
            tg.soundSetList.innerHTML = "";
            json.forEach(function (soundSet) {
                var newDiv = document.createElement("div");
                newDiv.className = "soundset-list-item";
                newDiv.innerHTML = soundSet.name;
                tg.soundSetList.appendChild(newDiv);
                soundSet.url = location.origin + "/data/" + soundSet.id;
                newDiv.onclick = function () {
                    tg.addPart(soundSet);
                };
            });
        });
    }
    tg.addPartFragment.style.display = "block";
    tg.newChosenButton(tg.addPartButton);
};

tg.hideDetails = function (hideFragment) {
    if (tg.beatsFragment) tg.beatsFragment.style.display = "none";
    if (tg.keyFragment) tg.keyFragment.style.display = "none";
    if (tg.chordsFragment) tg.chordsFragment.style.display = "none";
    if (tg.addPartFragment) tg.addPartFragment.style.display = "none";
    if (tg.surface) tg.surface.style.display = "none";
    if (tg.mixFragment) tg.mixFragment.style.display = "none";
    if (tg.saveFragment) tg.saveFragment.style.display = "none";
    if (tg.partOptionsFragment) tg.partOptionsFragment.style.display = "none";
    if (tg.userFragment) tg.userFragment.style.display = "none";
    if (tg.songFragment) tg.songFragment.style.display = "none";
    if (tg.sectionFragment) tg.sectionFragment.div.style.display = "none";
    if (tg.sequencer) tg.sequencer.div.style.display = "none";
    if (tg.instrument) tg.instrument.div.style.display = "none";
    
    if (tg.currentFragment && tg.currentFragment.onhide) {
        tg.currentFragment.onhide();
    }
    tg.currentFragment = null;
    
    if (hideFragment) {
        tg.detailFragment.style.display = "none";
        tg.chosenButton.classList.remove("selected-option");
        tg.chosenButton = undefined;
    }
    else {
        tg.detailFragment.style.display = "flex";
    }
};


tg.addPart = function (soundSet) {
    var blankPart = {soundSet: soundSet};
    var omgpart = new OMGPart(undefined,blankPart,tg.currentSection);
    tg.player.loadPart(omgpart);
    var div = tg.setupPartButton(omgpart);
    div.getElementsByClassName("part-button")[0].onclick();
};

tg.addOsc = function (type) {
  var soundSet = {"url":"PRESET_OSC_" + type.toUpperCase(),"name": type + " Oscillator",
      "type":"SOUNDSET","octave":5,"lowNote":0,"highNote":108,"chromatic":true};
  tg.addPart(soundSet);
};

tg.showMixFragment = function () {
    if (!tg.mixFragment) {
        tg.mixFragment = document.getElementById("mix-fragment");
    }
    var divs = [];
    tg.mixFragment.innerHTML = "";
    tg.currentSection.parts.forEach(function (part) {        
        tg.makeMixerDiv(part, divs);
    });
    
    tg.hideDetails();
    tg.mixFragment.style.display = "flex";
    tg.newChosenButton(tg.mixButton);
    
    divs.forEach(function (child) {
        child.sizeCanvas();
        child.drawCanvas(child);
    });
};

tg.showSaveFragment = function () {
    if (!tg.saveFragment) {
        tg.saveFragment = document.getElementById("save-fragment");
    }
    
    tg.hideDetails();
    tg.saveFragment.style.display = "block";
    tg.newChosenButton(tg.saveButton);
    
    if (tg.song.data.id) {
        delete tg.song.data.id;
    }
    var json = tg.song.getData();
    var ok = false;
    try {
        JSON.parse(JSON.stringify(json));
        ok = true;
    }
    catch (e) {}
    
    if (!ok) {
        //??
        return;
    }
    
    omg.server.post(json, function (response) {
        var saved = true; //??
        var savedUrl = location.origin + "/techno-gauntlet/?id=" + response.id;
        var div = document.getElementById("saved-url");
        div.value = savedUrl;
            //if (callback) {
            //    callback(response.id);
            //}
    });
};

tg.showPartOptionsFragment = function (part) {
    tg.hideDetails();
    tg.partOptionsFragment = document.getElementById("part-options-fragment");
    tg.partOptionsFragment.style.display = "block";
    
    var submixerButton = document.getElementById("part-options-submixer-button");
    var verticalRadio = document.getElementById("part-options-vertical-surface");
    var sequencerRadio = document.getElementById("part-options-sequencer-surface");
    if (part.data.surface.url === "PRESET_VERTICAL") {
        verticalRadio.checked = true;
        submixerButton.style.display = "none";
    }
    else {
        sequencerRadio.checked = true;
        submixerButton.style.display = "block";
    }
    verticalRadio.onchange = function () {
        part.data.surface.url = "PRESET_VERTICAL";
        submixerButton.style.display = "none";
        if (!part.data.notes) {
            part.data.notes = [];
        }
    };
    sequencerRadio.onchange = function () {
        submixerButton.style.display = "block";
        part.data.surface.url = "PRESET_SEQUENCER";
        if (!part.data.tracks) {
            part.makeTracks();
        }
    };
    
    document.getElementById("part-options-clear-button").onclick = function () {
        if (part.data.notes) {
            part.data.notes = [];
        }
        if (part.data.tracks) {
            for (var i = 0; i < part.data.tracks.length; i++) {
                for (var j = 0; j < part.data.tracks[i].data.length; j++) {
                    part.data.tracks[i].data[j] = false;
                }
            }
        }
    };
    document.getElementById("part-options-remove-button").onclick = function () {
        var i = tg.currentSection.parts.indexOf(part);
        if (i > -1) {
            tg.currentSection.parts.splice(i, 1)
            tg.currentSection.data.parts.splice(i, 1)
            tg.partList.removeChild(tg.partList.children[i])
        }
        tg.hideDetails();
    }
    
    submixerButton.onclick = function () {
        tg.showSubmixFragment(part);
    };
    
    tg.setupAddFXButtons(part);
    tg.setupPartOptionsFX(part);
};

tg.showSubmixFragment = function (part) {
    if (!tg.mixFragment) {
        tg.mixFragment = document.getElementById("mix-fragment");
    }
    var divs = [];
    tg.mixFragment.innerHTML = "";
    part.data.tracks.forEach(function (track) {
        tg.makeMixerDiv(track, divs);        
    });
    
    tg.hideDetails();
    tg.mixFragment.style.display = "flex";
    //tg.newChosenButton(tg.mixButton);
    
    divs.forEach(function (child) {
        child.sizeCanvas();
        child.drawCanvas(child);
    });
};

tg.makeMixerDiv = function (part, divs) {
    var newContainerDiv = document.createElement("div");
    newContainerDiv.className = "mixer-part";

    var audioParameters = part.audioParameters || part.data.audioParameters;
    
    var volumeProperty = {"property": "gain", "name": "Volume", "type": "slider", "min": 0, "max": 1, 
            "color": audioParameters.mute ?"#880000" : "#008800", transform: "square"};
    var warpProperty = {"property": "warp", "name": "Warp", "type": "slider", "min": 0, "max": 2, resetValue: 1, "color": "#880088"};
    var panProperty = {"property": "pan", "name": "Pan", "type": "slider", "min": -1, "max": 1, resetValue: 0, "color": "#000088"};
    var mixerVolumeCanvas = new SliderCanvas(null, volumeProperty, part.gain, audioParameters);
    mixerVolumeCanvas.div.className = "mixer-part-volume";
    var mixerWarpCanvas = new SliderCanvas(null, warpProperty, null, audioParameters);
    mixerWarpCanvas.div.className = "mixer-part-warp";
    var mixerPanCanvas = new SliderCanvas(null, panProperty, part.panner, audioParameters);
    mixerPanCanvas.div.className = "mixer-part-pan";

    newContainerDiv.appendChild(mixerVolumeCanvas.div);
    newContainerDiv.appendChild(mixerWarpCanvas.div);
    newContainerDiv.appendChild(mixerPanCanvas.div);
    tg.mixFragment.appendChild(newContainerDiv);
    divs.push(mixerVolumeCanvas);
    divs.push(mixerWarpCanvas);
    divs.push(mixerPanCanvas);
    
    var captionDiv = document.createElement("div");
    captionDiv.innerHTML = part.name || (part.data.soundSet ? part.data.soundSet.name : "");
    captionDiv.className = "mixer-part-name";
    newContainerDiv.appendChild(captionDiv);

};

tg.availableFX = ["Delay", "Chorus", "Phaser", "Overdrive", "Compressor", 
    "Reverb", "Filter", "Cabinet", "Tremolo", 
    "Wah Wah", "Bitcrusher", "Moog", "Ping Pong"
];

tg.setupAddFXButtons = function (part) {
    var availableFXDiv = document.getElementById("part-options-available-fx");
    availableFXDiv.style.display = "none";
    availableFXDiv.innerHTML = "";
    tg.availableFX.forEach(function (fx) {
        var fxDiv = document.createElement("div");
        fxDiv.className = "fx-button"
        fxDiv.innerHTML = fx;
        fxDiv.onclick = function () {
            tg.addFXToPart(fx, part);
            addButton.onclick();
        };
        availableFXDiv.appendChild(fxDiv);
    });
    
    var addButton = document.getElementById("part-options-add-fx-button");
    addButton.innerHTML = "Add FX";
    addButton.onclick = function () {
        if (availableFXDiv.style.display === "none") {
            availableFXDiv.style.display = "flex";
            addButton.innerHTML = "Hide FX";
        }
        else {
            availableFXDiv.style.display = "none"
            addButton.innerHTML = "Add FX";
        }
    };
};

tg.addFXToPart = function (fxName, part) {
    var fxNode = tg.player.addFXToPart(fxName, part);
    
    tg.setupFXDiv(fxNode, part);
};

tg.setupPartOptionsFX = function (part) {
    tg.fxListDiv = document.getElementById("part-options-fx-list");
    tg.fxListDiv.innerHTML = "";
    part.fx.forEach(function (fx) {
        tg.setupFXDiv(fx, part);
    });
};

tg.setupFXDiv = function (fx, part) {
    var holder = document.createElement("div");
    holder.className = "fx-controls";
    var captionDiv = document.createElement("div");
    captionDiv.className = "fx-controls-caption";
    captionDiv.innerHTML = fx.data.name;
    holder.appendChild(captionDiv);
    tg.fxListDiv.appendChild(holder);
    tg.setupFXControls(fx, part, holder);
    
    var tools = document.createElement("div");
    tools.className = "fx-controls-tools";
    holder.appendChild(tools);
    var bypassButton = document.createElement("div");
    bypassButton.innerHTML = "Bypass FX";
    bypassButton.onclick = function () {
        fx.bypass = !fx.bypass ? 1 : 0;
        fx.data.bypass = fx.bypass ? 1 : 0;
        bypassButton.classList.toggle("selected-option");
    };
    var removeButton = document.createElement("div");
    removeButton.innerHTML = "Remove FX";
    removeButton.onclick = function () {
        tg.fxListDiv.removeChild(holder);
        tg.player.removeFXFromPart(fx, part);
    };
    tools.appendChild(bypassButton);
    tools.appendChild(removeButton);
    
    if (fx.bypass) {
        bypassButton.classList.add("selected-option");
    }
};

tg.setupFXControls = function (fx, part, fxDiv) {
    var controls = tg.player.fx[fx.data.name].controls;
    var divs = [];
    controls.forEach(function (control) {        
        if (control.type === "slider") {
            var canvas = document.createElement("canvas");
            canvas.className = "fx-slider";
            fxDiv.appendChild(canvas);
            var slider = new SliderCanvas(canvas, control, fx, fx.data);
            divs.push(slider);
        }
    });
    divs.forEach((div) => {
        div.sizeCanvas();
        div.drawCanvas();

    });
};

function SliderCanvas(canvas, controlInfo, audioNode, data) {
    var m = this;
    if (!canvas) {
        canvas = document.createElement("canvas");
    }
    var offsets = omg.ui.totalOffsets(canvas);
    canvas.onmousedown = function (e) {
        offsets = omg.ui.totalOffsets(canvas);
        m.ondown(e.clientX - offsets.left);
    };
    canvas.onmousemove = function (e) {
        m.onmove(e.clientX - offsets.left);};
    canvas.onmouseup = function (e) {m.onup();};
    canvas.onmouseout = function (e) {m.onup();};
    canvas.ontouchstart = function (e) {
        offsets = omg.ui.totalOffsets(canvas);
        m.ondown(e.targetTouches[0].pageX - offsets.left);
    };
    canvas.ontouchmove = function (e) {
        m.onmove(e.targetTouches[0].pageX - offsets.left);
    };
    canvas.ontouchend = function (e) {m.onup();};

    this.div = canvas;
    this.ctx = canvas.getContext("2d");
    this.data = data;
    this.audioNode = audioNode;
    this.controlInfo = controlInfo;
    this.percent = 0;
    this.isAudioParam = audioNode && typeof audioNode[controlInfo.property] === "object";
    
    this.frequencyTransformScale = Math.log(controlInfo.max) - Math.log(controlInfo.min);
    
    if (typeof this.controlInfo.resetValue === "number") {
        var slider = this;
        this.div.ondblclick = function () {
            slider.onupdate(slider.controlInfo.resetValue);
        };
    }
}

SliderCanvas.prototype.ondown = function (x) {
    this.isTouching = true;
    this.onnewX(x);
};
SliderCanvas.prototype.onmove = function (x) {
    if (this.isTouching) {
        this.onnewX(x);
    }
};
SliderCanvas.prototype.onnewX = function (x) {
    this.percent = x / this.div.clientWidth;
    if (this.controlInfo.transform === "square") {
        this.percent = this.percent * this.percent;
    }
    var value;
    if (this.controlInfo.min === 20 && this.controlInfo.max > 10000) {
        value = Math.exp(this.percent * this.frequencyTransformScale + Math.log(this.controlInfo.min));
    }
    else {
        value = Math.min(this.controlInfo.max, 
                 Math.max(this.controlInfo.min, 
            (this.controlInfo.max - this.controlInfo.min) * this.percent + this.controlInfo.min));
    }
    this.onupdate(value);
};

SliderCanvas.prototype.onupdate = function (value) {
    if (this.audioNode) {
        if (this.isAudioParam) {
            this.audioNode[this.controlInfo.property].setValueAtTime(value, tg.player.context.currentTime);
        }
        else {
            this.audioNode[this.controlInfo.property] = value;
        }
    }
    if (this.data) {
        this.data[this.controlInfo.property] = value;
    }
    this.drawCanvas(this.div);    
};
SliderCanvas.prototype.onup = function (e) {
    this.isTouching = false;
};
SliderCanvas.prototype.sizeCanvas = function () {
    this.div.width = this.div.clientWidth;
    this.div.height = this.div.clientHeight;
};
SliderCanvas.prototype.drawCanvas = function () {
    this.div.width = this.div.width;

    this.ctx.fillStyle = this.controlInfo.color || "#008800";
    var value = this.data[this.controlInfo.property];
    var percent = value;
    if (this.controlInfo.transform === "square") {
        percent = Math.sqrt(percent);
    }
    percent = (percent - this.controlInfo.min) / (this.controlInfo.max - this.controlInfo.min);
    if (this.controlInfo.min === 20 && this.controlInfo.max > 10000) {
        percent = (Math.log(value) - Math.log(this.controlInfo.min)) / this.frequencyTransformScale;
    }
    var startX = this.controlInfo >= 0 ? 0 : 
            ((0 - this.controlInfo.min) / (this.controlInfo.max - this.controlInfo.min));
    startX = startX * this.div.clientWidth;
    if (startX) {
        this.ctx.fillRect(startX - 2, 0, 4, this.div.height);
    }
    this.ctx.fillRect(startX, 0, percent * this.div.clientWidth - startX, this.div.height);
    this.ctx.fillStyle = "white";
    this.ctx.font = "10pt sans-serif";
    this.ctx.fillText(this.controlInfo.name, 10, this.div.height / 2 + 5);
    var suffix = "";
    if (value > 1000) {
        value = value / 1000;
        suffix = "K";
    }
    value = Math.round(value * 100) / 100;
    value = value + "" + suffix;
    var valueLength = this.ctx.measureText(value).width;
    this.ctx.fillText("", 0, 0);
    this.ctx.fillText(value, this.div.clientWidth - valueLength - 10, this.div.height / 2 + 5);

};

tg.newChosenButton = function (button) {
    if (tg.chosenButton) {
        tg.chosenButton.classList.remove("selected-option");
    }
    tg.chosenButton = button;
    button.classList.add("selected-option");
};


tg.userButton = document.getElementById("main-fragment-user-button");
tg.userButton.onclick = function () {
    tg.hideDetails();
    tg.showUserFragment();
    tg.newChosenButton(tg.userButton);
};
tg.showUserFragment = function () {
    if (!tg.userFragment) {
        tg.userFragment = document.getElementById("user-fragment");
        document.getElementById("user-logout-button").onclick = function () {
            omg.server.logout(() => {
                tg.onlogin(undefined);
            });
        };
        document.getElementById("user-login-button").onclick = function () {
            omg.server.login(
                document.getElementById("user-login-username").value, 
                document.getElementById("user-login-password").value, function (results) {
                    if (results) {
                        document.getElementById("user-login-signup").style.display = "none";
                        tg.onlogin(results);
                        tg.showUserThings();
                    }
                    else {
                        document.getElementById("user-login-invalid").style.display = "inline-block";
                    }
                });
        };
        document.getElementById("user-signup-button").onclick = function () {
            omg.server.signup(
                document.getElementById("user-signup-username").value, 
                document.getElementById("user-signup-password").value, function (results) {
                    if (results) {                        
                        tg.onlogin(results);
                        tg.showUserThings();
                    }
                    else {
                        document.getElementById("user-login-invalid").style.display = "inline-block";
                    }
                });
        };
    }
    
    if (tg.user) {
        document.getElementById("user-login-signup").style.display = "none";
        tg.showUserThings();
    }
    
    tg.userFragment.style.display = "block";
};

tg.showUserThings = function () {
    var listDiv = document.getElementById("user-fragment-detail-list");
    listDiv.innerHTML = "";
    omg.util.getUserThings(tg.user, listDiv, function (thing) {
        if (thing.type && thing.type === "SOUNDSET") {
            tg.addPart(thing);
        }
        else {
            tg.loadSong(thing);
            if (window.innerWidth < window.innerHeight) {
                tg.hideDetails(true);
            }
        }
    });
};

tg.songButton = document.getElementById("main-fragment-song-button");
tg.songButton.onclick = function () {
    tg.hideDetails();
    tg.showSongFragment();
    tg.newChosenButton(tg.songButton);
};
tg.showSongFragment = function () {
    if (!tg.songFragment) {
        tg.songFragment = document.getElementById("song-fragment");
        tg.songFragment.nameInput = document.getElementById("song-info-name");
        tg.songFragment.tagsInput = document.getElementById("song-info-tags");
        document.getElementById("song-info-update").onclick = function () {
            tg.song.data.name = tg.songFragment.nameInput.value;
            document.getElementById("tool-bar-song-button").innerHTML = tg.songFragment.nameInput.value;
            tg.song.data.tags = tg.songFragment.tagsInput.value;
        };
    }
    tg.songFragment.nameInput.value = tg.song.data.name || "";
    tg.songFragment.tagsInput.value = tg.song.data.tags || "";
    
    document.getElementById("create-new-song-button").onclick = function () {
        tg.newBlankSong();
    };
        
    tg.songFragment.style.display = "block";
};

tg.onlogin = function (user) {
    tg.user = user;
    document.getElementById("tool-bar-user-button").innerHTML = user ? user.username : "Login";
    document.getElementById("user-login-signup").style.display = user ? "none" : "block";
    document.getElementById("user-info").style.display = user ? "block" : "none";
    document.getElementById("user-info-username").innerHTML = user ? user.username : "Login";
};

tg.backButton = document.getElementById("back-button");
tg.backButton.onclick = function () {
    tg.hideDetails(true);
};

tg.setupAddPartTabs = function () {
    var f = tg.addPartFragment;
    var galleryTab = document.getElementById("add-part-gallery-button");
    var oscillatorTab = document.getElementById("add-part-oscillator-button");
    var customTab = document.getElementById("add-part-custom-button");
    var gallery = document.getElementById("add-part-gallery");
    var oscillator = document.getElementById("add-part-oscillator");
    var custom = document.getElementById("add-part-custom");
    var lastTab;
    
    galleryTab.onclick = function (e) {
        gallery.style.display = "block";
        oscillator.style.display = "none";
        custom.style.display = "none";
        if (lastTab) {
            lastTab.classList.remove("selected-option");
        }
        lastTab = e.target;
        e.target.classList.add("selected-option");
    };
    oscillatorTab.onclick = function (e) {
        gallery.style.display = "none";
        oscillator.style.display = "block";
        custom.style.display = "none";
        if (lastTab) {
            lastTab.classList.remove("selected-option");
        }
        lastTab = e.target;
        e.target.classList.add("selected-option");
    };
    customTab.onclick = function (e) {
        gallery.style.display = "none";
        oscillator.style.display = "none";
        custom.style.display = "block";
        if (lastTab) {
            lastTab.classList.remove("selected-option");
        }
        lastTab = e.target;
        e.target.classList.add("selected-option");
    };
    
    galleryTab.onclick({target: galleryTab});
};

tg.newBlankSong = function () {
    var blankSong = {
        "name":"","type":"SONG","sections":[
            {"name": "Intro", "type":"SECTION","parts":[],"chordProgression":[0]}
        ],
        "keyParameters":{"scale":[0,2,4,5,7,9,11],"rootNote":0},
        "beatParameters":{"bpm":"120","beats":4,"shuffle":0,"measures":1,"subbeats":4}
    };
    tg.loadSong(blankSong);
};

tg.sectionButton = document.getElementById("main-fragment-section-button");
tg.sectionButton.onclick = function () {
    tg.hideDetails();
    tg.showSectionFragment();
    tg.newChosenButton(tg.sectionButton);
};
tg.sectionFragment = {};
tg.sectionFragment.div = document.getElementById("section-fragment");
tg.sectionFragment.div.onclick = function () {
    tg.sectionFragment.presetNameMenuDiv.style.display = "none";
    tg.sectionFragment.contextMenuNameDiv = null;
};
tg.sectionFragment.listDiv = document.getElementById("section-fragment-list");
tg.sectionFragment.presetNameMenuDiv = document.getElementById("preset-section-name-menu");
tg.sectionFragment.presetNameListDiv = document.getElementById("preset-section-name-list");
document.getElementById("copy-section-button").onclick = function () {
    var section = tg.copySection();
    tg.sectionFragment.addSectionListItem(section)
};
tg.sectionFragment.renameInput = document.getElementById("section-rename-input");
tg.sectionFragment.renameInput.onclick = function () {
    tg.currentSection.name = tg.sectionFragment.renameInput.value;
    tg.setSongControlsUI();
};
["Intro", "Preverse", "Verse", "Prechorus", 
    "Chorus", "Bridge", "Solo", "Breakdown", 
    "Refrain", "Outro"].forEach(sectionName => {
        var presetNameDiv = document.createElement("div");
        presetNameDiv.className = "preset-name-list-item";
        presetNameDiv.innerHTML = sectionName;
        presetNameDiv.onclick = function () {
            tg.sectionFragment.updateSectionName(sectionName);
        };
        tg.sectionFragment.presetNameListDiv.appendChild(presetNameDiv);
    });
tg.sectionFragment.renameInput.onclick = function (e) {
    e.stopPropagation();
};
tg.sectionFragment.renameInput.onkeypress = function (e) {
    if (e.keyCode === 13) {
        tg.sectionFragment.updateSectionName(e.target.value);
    }
};

tg.sectionFragment.updateSectionName = (sectionName) => {
    tg.sectionFragment.contextMenuSection.data.name = sectionName;
    tg.sectionFragment.contextMenuNameDiv.innerHTML = sectionName;
    tg.sectionFragment.presetNameMenuDiv.style.display = "none";
    tg.setSongControlsUI();
};
tg.sectionFragment.updateSelectedSection = (sectionDiv) => {
    if (tg.sectionFragment.selectedSection) {
        tg.sectionFragment.selectedSection.classList.remove("selected-option");
    }
    sectionDiv.classList.add("selected-option");
    tg.sectionFragment.selectedSection = sectionDiv;
};
tg.sectionFragment.addSectionListItem = (section) => {
    var sectionDiv = document.createElement("div");
    sectionDiv.className = "section-list-item";

    var sectionNameDiv = document.createElement("div");
    sectionNameDiv.className = "section-list-item-name";
    sectionNameDiv.innerHTML = section.data.name || "(Untitled)";

    var sectionRenameDiv = document.createElement("div");
    sectionRenameDiv.className = "section-list-item-rename";
    sectionRenameDiv.innerHTML = "&#9776;";
    sectionRenameDiv.onclick = function (e) {
        e.stopPropagation();
        if (tg.sectionFragment.contextMenuNameDiv === sectionNameDiv) {
            tg.sectionFragment.presetNameMenuDiv.style.display = "none";
            tg.sectionFragment.contextMenuNameDiv = null;
            return;
        }
        //var offsets = omg.ui.totalOffsets(sectionDiv, tg.sectionFragment.div);
        var offsets = {top: sectionDiv.offsetTop, left: sectionDiv.offsetLeft};
        tg.sectionFragment.presetNameMenuDiv.style.left = offsets.left + "px";
        tg.sectionFragment.presetNameMenuDiv.style.top = offsets.top + sectionDiv.clientHeight + "px";
        tg.sectionFragment.presetNameMenuDiv.style.width = sectionDiv.clientWidth / 2 + "px";
        tg.sectionFragment.presetNameMenuDiv.style.display = "block";

        tg.sectionFragment.contextMenuSection = section;
        tg.sectionFragment.contextMenuNameDiv = sectionNameDiv;
        tg.sectionFragment.renameInput.value = section.data.name;
    };

    sectionDiv.onclick = function () {
        tg.loadSection(section);
        tg.sectionFragment.updateSelectedSection(sectionDiv);
        tg.setSongControlsUI();
    };
    if (section === tg.currentSection) {
        tg.sectionFragment.updateSelectedSection(sectionDiv);
    }
    sectionDiv.appendChild(sectionRenameDiv);
    sectionDiv.appendChild(sectionNameDiv);
    tg.sectionFragment.listDiv.appendChild(sectionDiv);
    return sectionDiv;
};


tg.showSectionFragment = function () {
    tg.sectionFragment.presetNameMenuDiv.style.display = "none";
    tg.sectionFragment.listDiv.innerHTML = "";
    tg.song.sections.forEach(section => {
        tg.sectionFragment.addSectionListItem(section);
    });
    tg.sectionFragment.div.style.display = "block";
};

tg.copySection = function (name) {
    var newSectionData = JSON.parse(JSON.stringify(tg.currentSection.getData()));
    if (name) newSectionData.name = name;
    var newSection = new OMGSection(null, newSectionData, tg.song);
    tg.loadSection(newSection);
    return newSection;
};

tg.loadSection = function (section) {
    tg.currentSection = section;
    tg.partList.innerHTML = "";
    for (var j = 0; j < section.parts.length; j++) {
        tg.setupPartButton(section.parts[j]);
    }
    tg.player.loopSection = tg.song.sections.indexOf(section);
};




// away we go
// KEEP THIS LAST
tg.getSong(function (song) {
    tg.loadSong(song);
});
omg.server.getHTTP("/user/", function (res) {
    if (res) {
        tg.onlogin(res);
    }
});
