function OMGMonkey(song, section) {
    
    this.song = song;
    this.section = section;
    this.loop = -1;
    
    var monkey = this;
    this.changeables = [
        {name: "Tempo", probability: 0, functions: monkey.getTempoFunctions()},
        {name: "Mute", probability: 0, functions: monkey.getMuteFunctions()},
        {name: "Volume/Pan", probability: 0, functions: monkey.getVolumePanFunctions()},
        {name: "Chords", probability: 0, functions: monkey.getChordsFunctions()},
        {name: "New Part", probability: 0, functions: monkey.getNewPartFunctions()}, 
        //{name: "Notes and Beats", probability: 0, functions: monkey.getPartDataFunctions()},
        {name: "Key Signature", probability: 0, functions: monkey.getKeyFunctions()}
    ];
}

OMGMonkey.prototype.randomize = function () {    
    var monkey = this;
    this.changeables.forEach((changeable) => {
        if (Math.random() < changeable.probability) {
            monkey.change(changeable);
        }
    });
    
    if (this.loop > 0) {
        setTimeout(function () {
            monkey.randomize();
        }, this.loop * 1000);
    }

};

OMGMonkey.prototype.getRandomI = function (array) {
    return i = Math.floor(Math.random() * array.length);
};
OMGMonkey.prototype.getRandomElement = function (array) {
    return array[this.getRandomI(array)];
};

OMGMonkey.prototype.change = function (changeable) {
    this.getRandomElement(changeable.functions)(this.song);
};

OMGMonkey.prototype.getMuteFunctions = function () {
    var monkey = this;
    return [
    function () {
        monkey.forRandomRandomParts(function (part) {
            part.data.audioParams.mute = 
                    !part.data.audioParams.mute;
            monkey.song.partMuteChanged(part);
        });
    }
]};

OMGMonkey.prototype.forOneRandomPart = function (callback) {
    if (!this.section.parts.length) return;
    var partI = Math.floor(Math.random() * this.section.parts.length);
    callback(this.section.parts[partI]);
};
OMGMonkey.prototype.forRandomParts = function (callback) {
    if (!this.section.parts.length) return;
    var monkey = this;
    monkey.section.parts.forEach(part => {
        if (Math.random() < 1 / monkey.section.parts.length) {
            callback(part);
        }
    });
};
OMGMonkey.prototype.forRandomRandomParts = function (callback) {
    if (Math.random() > 0.5) {
        this.forOneRandomPart(callback);
    }
    else {
        this.forRandomParts(callback);
    }
};


OMGMonkey.prototype.getKeyFunctions = function () {
    
    return [
    function (song) {
        song.data.keyParams.rootNote = Math.floor(Math.random() * 12);
        song.keyChanged();
    },
    function (song) {
        song.data.keyParams.rootNote += 1 + Math.floor(Math.random() * 2);
        song.data.keyParams.rootNote = song.data.keyParams.rootNote % 12;
        song.keyChanged();
    },
    function (song) {
        song.data.keyParams.rootNote -= 1 + Math.floor(Math.random() * 2);
        if (song.data.keyParams.rootNote < 0) song.data.keyParams.rootNote = 11;
        song.keyChanged();
    },
    function (song) {
        song.data.keyParams.scale = omg.ui.scales[Math.floor(Math.random() * omg.ui.scales.length)].value;
        song.keyChanged();
    },
    function (song) {
        song.data.keyParams.rootNote = Math.floor(Math.random() * 12);
        song.data.keyParams.scale = omg.ui.scales[Math.floor(Math.random() * omg.ui.scales.length)].value;
        song.keyChanged();
    }
]};

OMGMonkey.prototype.getTempoFunctions = function () {
    var monkey = this;
    return [
    function (song) {
        if (monkey.song.data.beatParams.shuffle == 0) {
            monkey.changeShuffle(30);
        }
        else if (monkey.song.data.beatParams.shuffle > 0.15) {
            monkey.changeShuffle(monkey.song.data.beatParams.shuffle * -100);
        }
        else {
            monkey.changeShuffle(2);
        }
    },
    function (song) {
        monkey.changeShuffle(Math.round(Math.random() * 2) - 1);
    },
    function (song) {
        monkey.changeShuffle(Math.round(Math.random() * 4) - 2);
    },
    function (song) {
        monkey.changeShuffle(Math.round(Math.random() * 10) - 5);
    },
    function (song) {
        monkey.changeTempo(Math.round(Math.random() * 2) - 1);
    },
    function (song) {
        monkey.changeTempo(Math.round(Math.random() * 4) - 2);
    },
    function (song) {
        monkey.changeTempo(Math.round(Math.random() * 10) - 5);
    },
    function (song) {
        monkey.changeTempo(Math.round(Math.random() * 20) - 10);
    },
    function (song) {
        monkey.changeTempo(Math.round(Math.random() * 40) - 20);
    }
]};

OMGMonkey.prototype.changeTempo = function (bpmChange) {
    this.song.data.beatParams.bpm = Math.min(Math.max(this.song.data.beatParams.bpm + bpmChange, 40), 200);
    this.song.tempoChanged();
};
OMGMonkey.prototype.changeShuffle = function (change) {
    this.song.data.beatParams.shuffle = Math.min(Math.max(this.song.data.beatParams.shuffle + change / 100, 0), 0.50);
    this.song.tempoChanged();
};

OMGMonkey.prototype.getVolumePanFunctions = function () {
    var monkey = this;
    return [
    function () {
        monkey.forRandomRandomParts(function (part) {
            monkey.changePan(part, Math.random() * Math.random() > 0.5 ? 1 : -1);
        });
    },
    function () {
        monkey.forRandomRandomParts(function (part) {
            monkey.changeVolume(part, Math.random() * Math.random() > 0.5 ? 1 : -1);
        });
    },
    function () {
        monkey.forRandomRandomParts(function (part) {
            monkey.changePan(part, Math.round(Math.random() * 2) - 1);
        });
    },
    function () {
        monkey.forRandomRandomParts(function (part) {
            monkey.changePan(part, Math.round(Math.random() * 4) - 2);
        });
    },
    function () {
        monkey.forRandomRandomParts(function (part) {
            monkey.changePan(part, Math.round(Math.random() * 10) - 5);
        });
    },
    function () {
        monkey.forRandomRandomParts(function (part) {
            monkey.changeVolume(part, Math.round(Math.random() * 2) - 1);
        });
    },
    function () {
        monkey.forRandomRandomParts(function (part) {
            monkey.changeVolume(part, Math.round(Math.random() * 4) - 2);
        });
    },
    function () {
        monkey.forRandomRandomParts(function (part) {
            monkey.changeVolume(part, Math.round(Math.random() * 10) - 5);
        });
    },
    function () {
        monkey.forRandomRandomParts(function (part) {
            monkey.changeVolume(part, Math.round(Math.random() * 20) - 10);
        });
    },
    function () {
        monkey.forRandomRandomParts(function (part) {
            monkey.changeVolume(part, Math.round(Math.random() * 40) - 20);
        });
    }
];
};

OMGMonkey.prototype.changeVolume = function (part, change) {
    part.data.audioParams.gain = Math.min(Math.max(part.data.audioParams.gain + change / 10, 0.1), 0.95);
    this.song.partMuteChanged(part);
};
OMGMonkey.prototype.changePan = function (part, change) {
    part.data.audioParams.pan = Math.min(Math.max(part.data.audioParams.pan + change / 10, -1), 1);
    this.song.partMuteChanged(part);
};



OMGMonkey.prototype.getChordsFunctions = function () {
    var monkey = this;
    var scale = monkey.song.data.keyParams.scale
    return [
    function () {
        var n = monkey.randomChord(scale);
        monkey.changeChords([n]);
    },
    function () {
        monkey.changeChords([0]);
    },
    function () {
        monkey.changeChords([-1]);
    },
    function () {
        var a = [];
        var n = Math.floor(Math.random() * 5);
        for (var i = 0; i < n; i++) {
            a.push(monkey.randomChord(scale));
        }
        monkey.changeChords(a);
    }
    ];
};

OMGMonkey.prototype.randomChord = function (scale) {
    var n = scale.length;
    n = n * 2 - 1;
    n = Math.floor(Math.random() * n);
    n = n - scale.length + 1;
    return n;
};

OMGMonkey.prototype.changeChords = function (chords) {
    this.section.data.chordProgression = chords;
    this.song.chordProgressionChanged(this.section);
};


OMGMonkey.prototype.getNewPartFunctions = function () {
    var monkey = this;
    return [
    function () {
        //todo get soundfonts from somewhere else
        var sfs = ["http://gleitz.github.io/midi-js-soundfonts/MusyngKite/",
                   "http://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/"];
        var sf = sfs[Math.floor(Math.random() * sfs.length)];
        var i = Math.floor(Math.random() * omg.ui.soundFontNames.length);
        var s = omg.ui.soundFontNames[i];
        var soundSet = OMusicPlayer.prototype.getSoundSetForSoundFont(s, sf + s + "-mp3/");
        var blankPart = {soundSet: soundSet, notes: monkey.newMelody()};
        var part = new OMGPart(undefined,blankPart,monkey.section);
        monkey.song.partAdded(part);

        
      //pick a random part from the gallery
        //pick a random soundset/soundfont from the gallery and fill it
        //pick an oscillator and fill it
    }
    ];
};

OMGMonkey.prototype.newMelody = function () {
    return this.getRandomElement(this.getNewMelodyFunctions())();
    
};

OMGMonkey.prototype.getNewMelodyFunctions = function () {
    var monkey = this;
    return [
        function () {
            var beatsLeft = monkey.song.data.beatParams.beats * 
                    monkey.song.data.beatParams.measures;
            var notes = [];
            var note;
            var nextNoteNumber = Math.floor(Math.random() * 20) - 10;
            while (beatsLeft > 0) {
                note = monkey.getRandomNote();
                note.note = nextNoteNumber;
                note.beats = Math.min(note.beats, beatsLeft);
                notes.push(note);
                beatsLeft -= note.beats;
                nextNoteNumber = monkey.getRandomNoteNumber(nextNoteNumber);
            }
            return notes;
        }
    ];
};

OMGMonkey.prototype.getRandomBeats = function () {
    var n = (Math.floor(Math.round(Math.random() * 
            this.song.data.beatParams.subbeats)) + 1) /
            this.song.data.beatParams.subbeats;
    if (Math.random() > 0.7) {
        n = n * this.song.data.beatParams.beats; 
    }
    return n;
};

OMGMonkey.prototype.getRandomNote = function () {
    return {
        rest: Math.random > 0.7,
        beats: this.getRandomBeats()
    };
};

OMGMonkey.prototype.getRandomNoteNumber = function (n) {
    if (Math.random() < 0.2) {
        return n;
    }
    if (Math.random() < 0.1) {
        return Math.floor(Math.random() * 20) - 10;
    }
    var d;
    if (Math.random() > 0.6) {
        d = Math.floor(Math.random() * 10) - 5;
    }
    else {
        d = Math.floor(Math.random() * 5) - 2;
    }
    return n + d;
};