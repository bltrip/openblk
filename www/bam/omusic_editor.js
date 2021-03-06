"use strict";
/* 
 omgbam.js ported to a class definition  
 */


function OMusicEditor() {
    this.animLength = 500;
    this.borderRadius = 3;
    this.fadingOut = [];

    this.url = "/music";
    this.fileext = ".mp3"; //needsMP3() ? ".mp3" : ".ogg",

    this.loadWhenReady = true;

    this.keys = ["C", "C#/Db", "D", "D#/Eb",
        "E", "F", "F#/Gb", "G", "G#/Ab",
        "A", "A#/Bb", "B"];
    this.scales = [{name: "Major", value: [0, 2, 4, 5, 7, 9, 11]},
        {name: "Minor", value: [0, 2, 3, 5, 7, 8, 10]},
        {name: "Pentatonic", value: [0, 2, 5, 7, 9]},
        {name: "Blues", value: [0, 3, 5, 6, 7, 10]}];

    this.mutedPartColor = "#FF8888";
}


OMusicEditor.prototype.setup = function (options) {
    var bam = this;

    if (!options || !options.div) {
        debug("OMusicEditor() needs setup options with a div property");
        return;
    }

    bam.omgservice = omg.server;
    bam.bbody = options.div;

    if (!bam.player) {
        bam.player = new OMusicPlayer();
        bam.player.loopSection = 0;
    }
    bam.player.loadFullSoundSets = true;

    bam.soundsets = [];
    bam.soundsetsURLMap = {};

    //omg.ui should exist, obviously. Maybe this should be omg.ui = OMusicUI() 
    omg.ui.setupNoteImages();

    bam.windowWidth = bam.bbody.clientWidth;
    bam.windowHeight = bam.bbody.clientHeight;
    bam.offsetLeft = bam.bbody.clientWidth * 0.1; //bam.bbody.offsetLeft;

    bam.mobile = bam.windowWidth < 1000 && bam.windowWidth < bam.windowHeight;

    bam.offsetTop = 5; //bam.mobile ? 60: 88;
    //bam.chordsViewHeight = 30;
    bam.chordsViewHeight = 0;
    
    bam.div = document.getElementById("master");
    bam.keyButton = document.getElementById("omg-music-controls-key-button");
    bam.tempoButton = document.getElementById("omg-music-controls-tempo-button");
    bam.zones = [];

    bam.setupSectionEditor();
    bam.setupSongEditor();

    bam.setupMelodyMaker();

    bam.finishZone = document.getElementById("finish-zone");

    bam.player.onPlay = function () {
        if (bam.showingPlayButton) {
            bam.showingPlayButton.innerHTML = "STOP";
        }
    };
    bam.player.onStop = function () {
        if (bam.showingPlayButton) {
            bam.showingPlayButton.innerHTML = "PLAY";
            bam.showingPlayButton.className = bam.showingPlayButton.className
                    .replace("-blink", "");
        }
    };

    var pauseBlinked = false;
    bam.player.onBeatPlayedListeners.push(function (isubbeat, isection) {

        if (bam.zones[bam.zones.length - 1] == bam.song.div
                && bam.player.song == bam.song) {

            bam.songZoneBeatPlayed(isubbeat, isection);
        } else if (bam.part && bam.zones[bam.zones.length - 1] == bam.part.div) {
            bam.partZoneBeatPlayed(isubbeat);
        } else if (bam.section && bam.zones[bam.zones.length - 1] == bam.section.div) {
            bam.sectionZoneBeatPlayed(isubbeat);
        }

        if (bam.showingPlayButton && isubbeat % 4 == 0) {
            if (!pauseBlinked) {
                if (bam.showingPlayButton.className.indexOf("-blink") == -1) {
                    bam.showingPlayButton.className = bam.showingPlayButton.className
                            + "-blink";
                }
            } else {
                bam.showingPlayButton.className = bam.showingPlayButton.className
                        .replace("-blink", "");
            }
            pauseBlinked = !pauseBlinked;
        }
    });

    var loadSoundSets = function () {
        bam.getSoundSets("", function (soundsets) {
            if (!bam.song)
                return;
            bam.song.sections.forEach(function (section) {
               section.parts.forEach(function (part) {
                    if (part.controls) {
                        part.controls.selectInstrument.innerHTML = 
                                bam.getSelectInstrumentOptions(part.data);
                        part.controls.selectInstrument.value = part.data.soundsetURL;                       
                    }
               });
            });
        });
    };

    var loadId;
    var loadParams;
    if (this.loadWhenReady) {
        loadParams = bam.getLoadParams();
        loadId = loadParams.id || loadParams.song || loadParams.section || loadParams.part;
        
        if (loadParams.testData) {
            loadParams.song = 1
            loadParams.dataToLoad = testData();
            bam.load(loadParams);
            loadSoundSets();
        }
        else if (!isNaN(loadId) && loadId > 0) {
            bam.omgservice.getId(loadId, function (result) {
                loadParams.dataToLoad = result;
                bam.load(loadParams);
                loadSoundSets();
            });
        } else {
            bam.load(loadParams);
            loadSoundSets();
        }
    }

    window.onresize = function () {
        bam.windowWidth = bam.bbody.clientWidth;
        bam.windowHeight = bam.bbody.clientHeight;
        bam.offsetLeft = bam.bbody.clientWidth * 0.1;

        bam.mobile = bam.windowWidth < 1000 && bam.windowWidth < bam.windowHeight;

        bam.offsetTop = 5; //bam.mobile ? 60 : 88;


        for (var iz = 0; iz < bam.zones.length; iz++) {
            bam.zones[iz].style.height = window.innerHeight + 10 + "px";
            //this offsetleft bit is for if the song gets scrolled left
            bam.zones[iz].style.width = -1 * bam.zones[iz].offsetLeft + window.innerWidth + 10 + "px";
        }

        if (bam.zones[bam.zones.length - 1] == bam.song.div) {
            bam.arrangeSections();
        }
        if (bam.section && bam.section.div &&
                bam.zones[bam.zones.length - 1] == bam.section.div) {
            bam.arrangeParts();
        }
    };

};

OMusicEditor.prototype.playButtonClick = function () {
    var bam = this;

    if (bam.zones[bam.zones.length - 1] == bam.song.div) {
        bam.songEditor.playButtonClick();
    } else if (bam.part && bam.zones[bam.zones.length - 1] == bam.part.div) {
        bam.mm.playButtonClick();
    } else if (bam.section && bam.zones[bam.zones.length - 1] == bam.section.div) {
        bam.sectionEditor.playButtonClick();
    }

};

OMusicEditor.prototype.nextButtonClick = function (callback) {
    var bam = this;

    if (bam.zones[bam.zones.length - 1] == bam.song.div) {
        bam.songEditor.nextButtonClick(callback);
    } else if (bam.part && bam.zones[bam.zones.length - 1] == bam.part.div) {
        bam.mm.nextButtonClick(callback);
    } else if (bam.section && bam.zones[bam.zones.length - 1] == bam.section.div) {
        bam.sectionEditor.nextButtonClick(callback);
    } else if (bam.section && bam.zones[bam.zones.length - 1] == bam.section.chordsView) {
        bam.sectionEditor.chordsNextButtonClick(callback);
    }

};


OMusicEditor.prototype.setupPartDiv = function (part) {
    var bam = this;

    var type = part.data.type;
    if (!part.data.surface) {
        part.data.surface = {url: part.data.surfaceURL || "PRESET_VERTICAL"};
    }
    var surface = part.data.surface.url;

    if (part.canvas) {
        debug("setupPartDiv: We are already setup!");
        return;
    }
    part.originalBackgroundColor = window.getComputedStyle(part.div, null).backgroundColor;
    if (part.data.mute) {
        part.div.style.backgroundColor = bam.mutedPartColor;
    }
    part.div.omgpart = part; //maybe not the best design, but helpful for in dragndrop

    part.canvas = document.createElement("div");
    part.canvas.className = "canvas-holder";
    part.div.appendChild(part.canvas);

    part.canvas.style.height = "100%";
    part.canvas.style.width = "100%";
    part.canvas.style.position = "relative";
    part.canvas.style.cursor = "pointer";
    part.canvas.onclick = function () {

        if (bam.readOnly) {
            return;
        }

        if (bam.zones[bam.zones.length - 1] != bam.section.div) {
            return;
        }

        if (bam.sectionEditor.mixerMode) {
            // mute?
            return;
        }

        bam.sectionEditor.editPart(part);
    };
    
    if (surface == "PRESET_SEQUENCER") {
        bam.setupDivForDrumbeat(part);
    } else {
        bam.setupMelodyDiv(part);
    }

};

OMusicEditor.prototype.setupDivForDrumbeat = function (part) {
    var bam = this;

        part.isNew = false;

    var params = {};
    params.foreColor = "black";
    params.downbeatColor = "#A0A0A0";
    params.beatColor = "#C0C0C0";

    part.ui = new OMGDrumMachine(part.canvas, part, params);
    
    part.canvas.update = function (isubbeat, y, z) {
        part.ui.setInfo();
        part.ui.draw(isubbeat);
    };
};

OMusicEditor.prototype.setupMelodyDiv = function (part) {
    var bam = this;
    var div = part.div;

    part.ui = new OMGMelodyMaker(part.canvas, part, bam.player);
    part.ui.highContrast = false;

    var beatMarker = document.createElement("div");
    var offsetLeft;
    var width;
    beatMarker.className = "beat-marker";
    //beatMarker.style.width = part.canvas.noteWidth + "px";
    //todo hardcoded 32! really sort out where beats subbeats and measures comes from
    beatMarker.style.width = part.canvas.clientWidth / 32 * 2 + "px";
    beatMarker.style.height = part.canvas.height + "px";
    beatMarker.style.top = part.canvas.offsetTop + "px";
    div.appendChild(beatMarker);
    var sizeSet = false;

    part.canvas.update = function (isubbeat) {
        if (!sizeSet) {
            beatMarker.style.width = part.canvas.clientWidth / 32 + "px";   
            beatMarker.style.top = part.canvas.offsetTop + "px";
            sizeSet = true;
        }
        if (part.currentI - 1 < part.data.notes.length
                && part.currentI >= 0) {
            offsetLeft = part.canvas.offsetLeft + 5;
            //width = part.canvas.noteWidth;
            width = part.canvas.width;
            //todo hardcoded total subbeats!!
            offsetLeft += width / 32 * isubbeat;
            beatMarker.style.display = "block";
            beatMarker.style.left = offsetLeft + "px";
        } else {
            beatMarker.style.display = "none";
        }
        part.ui.draw(isubbeat);
    };

    div.beatMarker = beatMarker;

};

OMusicEditor.prototype.setupSectionEditor = function () {
    var bam = this;

    bam.sectionEditor = document.createElement("div");
    bam.sectionEditor.className = "area";
    bam.sectionEditor.style.height = "100%";
    bam.sectionEditor.style.pointerEvents = "none";
    bam.bbody.appendChild(bam.sectionEditor);

    bam.sectionEditor.playButtonClick = function (e) {
        if (bam.player.playing) {
            bam.player.stop();
        } else {
            bam.player.play();
        }

        //TODO ? e doesn't necessarily exist, why is this here again?
        if (e) {
            e.stopPropagation();
        }
    };

    //TODO these should probably be replaced with a canvas soon
    //TODO also suggests a significant refactor
    //eliminating the separation of master/song/section and the editor
    //now uses css pointer-events:none and auto to make it work
    bam.sectionEditor.mixerHints = document.createElement("div");
    var hintDiv;
    hintDiv = document.createElement("div");
    hintDiv.className = "mixer-hint-volume-up";
    hintDiv.innerHTML = "Volume Up";
    bam.sectionEditor.mixerHints.appendChild(hintDiv);
    hintDiv = document.createElement("div");
    hintDiv.className = "mixer-hint-volume-down";
    hintDiv.innerHTML = "Volume Down";
    bam.sectionEditor.mixerHints.appendChild(hintDiv);
    hintDiv = document.createElement("div");
    hintDiv.className = "mixer-hint-pan-left";
    hintDiv.innerHTML = "Pan Left";
    bam.sectionEditor.mixerHints.appendChild(hintDiv);
    hintDiv = document.createElement("div");
    hintDiv.className = "mixer-hint-pan-right";
    hintDiv.innerHTML = "Pan Right";
    bam.sectionEditor.mixerHints.appendChild(hintDiv);
    bam.sectionEditor.mixerHints.style.display = "none";
    bam.sectionEditor.appendChild(bam.sectionEditor.mixerHints);


    bam.sectionEditor.nosection = document.createElement("div");
    bam.sectionEditor.nosection.className = "no-section-message";
    bam.sectionEditor.nosection.innerHTML = "(This Section is empty. Add some things to it!)";
    bam.sectionEditor.nosection.style.position = "absolute";
    bam.sectionEditor.appendChild(bam.sectionEditor.nosection);

    bam.sectionEditor.addButtons = document.createElement("div");
    bam.sectionEditor.addButtons.className = "remixer-add-buttons";
    if (bam.sectionEditor.addButtons) {
        bam.setupSectionAddButtons(bam.sectionEditor.addButtons);
    }
    bam.sectionEditor.appendChild(bam.sectionEditor.addButtons);

    //TODO isn't used
    bam.sectionEditor.clearButtonclick = function () {
        for (ip = bam.section.parts.length - 1; ip > -1; ip--) {
            bam.cancelPart(bam.section.parts[ip], true);
        }
        bam.sectionModified();
        bam.arrangeParts();
    };

    bam.sectionEditor.nextButtonClick = function () {
        if (bam.sectionEditor.mixerMode) {
            bam.sectionEditor.endMixerMode();
        }
        bam.sectionEditor.hide(function () {

            if (!bam.section.saved) {
                bam.song.saved = false;
                bam.section.data.previousId = bam.section.data.id;
                bam.section.data.id = undefined;
                bam.section.saving = true;
                bam.omgservice.post(bam.section.getData(), function (response) {
                    if (response && response.id) {
                        bam.section.saved = true;
                    }
                    bam.section.saving = false;
                });
            }

            bam.section.partsAreClean = false;

            bam.popZone(bam.section.div);

            bam.songEditor.show(bam.section);

            bam.player.loopSection = -1; //play(bam.song);

            bam.setupSectionDiv(bam.section);
        });
    };
    
    bam.sectionEditor.chordsNextButtonClick = function () {

        if (bam.sectionEditor.mixerMode) {
            bam.sectionEditor.dragAndDrop.setupChildDiv(part.div);
        }

        //if (!part.saved) 
            bam.section.saved = false;
        bam.section.chordsView.editting = false;

        var shrinkPart = function () {
            if (typeof bam.onzonechange == "function") {
                bam.onzonechange(bam.section);
            }
            bam.section.chordsView.style.zIndex = "1";

            bam.popZone(bam.section.chordsView);

            var otherParts = [];
            var otherPart;
            var otherPartsList = bam.section.div
                    .getElementsByClassName("part2");
            for (var ii = 0; ii < otherPartsList.length; ii++) {
                otherPart = otherPartsList.item(ii)
                otherParts.push(otherPart);
            }

            otherParts.push(bam.sectionEditor);
            //otherParts.push(bam.section.chordsView);
            bam.fadeIn(otherParts);

            bam.arrangeParts();
            bam.section.chordsView.removeChild(bam.section.chordsView.buttonGroup);
        };

        shrinkPart();
    };


    bam.sectionEditor.hide = function (callback) {
        var fadeOutList = [bam.sectionEditor];
        bam.section.parts.forEach(function (part) {
            if (part.div.beatMarker) {
                fadeOutList.push(part.div.beatMarker);
            }
        });
        bam.fadeOut(fadeOutList, callback);

    };

    bam.sectionEditor.show = function (callback) {
        bam.section.div.onmousedown = null;
        bam.section.div.ontouchstart = null;

        var fadeInList = [bam.sectionEditor];
        var part;
        for (var ip = bam.section.parts.length - 1; ip > -1; ip--) {
            part = bam.section.parts[ip];
            if (!part.canvas) {
                //not entirely sure why this should still be the case
                //controls were formerly hidden from the song view
                debug("no part.canvas: calling setup part div");
                bam.setupPartDiv(part);
                //fadeInList.push(part.controls);
            }
            //Probably a better way for this, but fadein makes it opaque
            if (part.div.beatMarker) {
                part.div.beatMarker.style.opacity = 0.6;
            }
        }
        bam.fadeIn(fadeInList, callback);

        if (bam.section.parts.length > 0) {
            //
        }

        if (typeof bam.onzonechange == "function") {
            bam.onzonechange(bam.section);
        }
    };

    bam.sectionEditor.startMixerMode = function () {
        bam.sectionEditor.mixerMode = true;
        bam.sectionEditor.dragAndDrop = new OMGDragAndDropHelper();
        bam.sectionEditor.mixerHints.style.display = "block";

        bam.sectionEditor.dragAndDrop.ondrag = function (div, x, y, px, py) {
            div.omgpart.data.volume = 1 - py;
            div.omgpart.data.pan = (px - 0.5) * 2;

            if (bam.player.playing) {
                bam.player.updatePartVolumeAndPan(div.omgpart);
            }
            return true;
        };
        bam.sectionEditor.dragAndDrop.onshortclick = function (div) {
            bam.toggleMute(div.omgpart);
        };

        bam.section.parts.forEach(function (part) {
            bam.sectionEditor.dragAndDrop.setupChildDiv(part.div);
        });

        bam.arrangeParts();
    };

    bam.sectionEditor.endMixerMode = function () {
        bam.sectionEditor.mixerMode = false;
        bam.sectionEditor.mixerHints.style.display = "none";
        bam.sectionEditor.dragAndDrop.disable();

        bam.arrangeParts();
    };

    bam.sectionEditor.showSongEditor = function () {
        bam.sectionEditor.nextButtonClick();
    };

    bam.sectionEditor.editPart = function (part, callback) {
        bam.part = part;

        //var fadeList = [bam.sectionEditor, bam.section.chordsView];
        var fadeList = [bam.sectionEditor];
        var otherPartsList = bam.section.div.getElementsByClassName("part2");
        for (var ii = 0; ii < otherPartsList.length; ii++) {
            if (otherPartsList.item(ii) !== part.div)
                fadeList.push(otherPartsList.item(ii));
            else
                part.position = ii;
        }
        
        bam.fadeOut(fadeList);

        bam.sectionEditor.growPart(part, callback);
    };
    
    bam.sectionEditor.growPart = function (part, callback) {
        
        /*var child = {div: part.div, 
                    targetX: 0,
                    targetY: 0,
                    targetW: bam.bbody.clientWidth,
                    targetH: bam.windowHeight};
        var children = [child];*/
        var child = {div: part.canvas, 
                    targetX: 0.10 * bam.bbody.clientWidth,
                    targetY: 0,
                    targetW: 0.80 * bam.bbody.clientWidth,
                    targetH: bam.windowHeight - part.canvas.offsetTop - 15};
        var children = [child];
        
        part.div.style.zIndex = "1";
        bam.fadeIn([part.ui.bgCanvas]);

        bam.grow(part.div, function () {
            if (callback) 
                callback();
            if (typeof bam.onzonechange === "function") {
                bam.onzonechange(bam.part);
            }
            if (part.ui) {
                part.ui.readOnly = false;
                if (part.ui.updateOffsets) {
                    part.ui.updateOffsets();
                }
                part.ui.backgroundDrawn = false;
                part.ui.draw();
            }
            part.div.style.zIndex = "auto";
        }, children);
    };
    
    bam.sectionEditor.editChords = function (part) {
        bam.part = part;

        var fadeList = [bam.sectionEditor];
        var otherPartsList = bam.section.div.getElementsByClassName("part2");
        for (var ii = 0; ii < otherPartsList.length; ii++) {
            fadeList.push(otherPartsList.item(ii));
        }

        bam.fadeOut(fadeList);

        bam.grow(bam.section.chordsView, function () {
            bam.makeChordsDialog();
            if (typeof bam.onzonechange === "function") {
                bam.onzonechange({div: bam.section.chordsView, data: {type: "CHORDS"}});
            }
        });
    };

 };

OMusicEditor.prototype.makeChordsDialog = function () {
    var bam = this;
    var buttonGroup = document.createElement("div");
    buttonGroup.className = "section-chords-dialog";
    //bam.section.chordsView.innerHTML = "";
    bam.section.chordsView.appendChild(buttonGroup);
    bam.section.chordsView.buttonGroup = buttonGroup;
    
    //todo song or section ascale
    var ascale = bam.song.data.keyParams.scale;
    var chordDiv;
    for (var i = -2; i < ascale.length; i++) {
        chordDiv = document.createElement("span");
        chordDiv.className = "remixer-add-button";
        chordDiv.innerHTML = omg.ui.getChordText(i, ascale);
        buttonGroup.appendChild(chordDiv);
        
        chordDiv.onclick = (function (i2) {
            return function () {
                if (!bam.section.data.chordProgression) {
                    bam.section.data.chordProgression = [];
                }
                bam.section.data.chordProgression.push(i2);
                bam.setChordsText(bam.section);
            }
        }(i));
    }

    var mixerButton = document.createElement("span");
    mixerButton.className = "remixer-add-button";
    mixerButton.innerHTML = "Clear";
    buttonGroup.appendChild(mixerButton);
    mixerButton.onclick = function () {
        bam.section.data.chordProgression = undefined;
        bam.setChordsText(bam.section);
    };

};

OMusicEditor.prototype.setupSectionAddButtons = function (buttonGroup) {
    var bam = this;

    var mixerButton = document.createElement("div");
    mixerButton.className = "remixer-add-button";
    mixerButton.innerHTML = "Mixer <br/>View";
    buttonGroup.appendChild(mixerButton);
    mixerButton.onclick = function () {
        if (bam.sectionEditor.mixerMode) {
            bam.sectionEditor.endMixerMode();
            mixerButton.innerHTML = "Mixer <br/>View";
        } else {
            bam.sectionEditor.startMixerMode();
            mixerButton.innerHTML = "Standard <br/>View";
        }
    };

    var melodyButton = document.createElement("div");
    melodyButton.className = "remixer-add-button";
    melodyButton.innerHTML = "Add <br/>Melody";
    buttonGroup.appendChild(melodyButton);
    melodyButton.onclick = function () {

        var newdiv = bam.createElementOverElement("part2", melodyButton, bam.bbody);

        var newPart = new OMGPart(newdiv, null, bam.section);
        bam.player.loadPart(newPart);
        newPart.data.surface = {
            "url": "PRESET_VERTICAL",
            "skipTop": 14,
            "skipBottom": 25
          };

        //var otherParts = [bam.section.chordsView];
        var otherParts = [];
        var otherPartsList = bam.section.div.getElementsByClassName("part2");
        for (var ii = 0; ii < otherPartsList.length; ii++) {
            otherParts.push(otherPartsList.item(ii));
        }
        bam.fadeOut(otherParts);

        bam.part = newPart;
        bam.section.div.appendChild(newdiv);
        newdiv.style.display = "block";
        newdiv.style.zIndex = "1";

        bam.setupPartDiv(newPart);
        
        bam.fadeOut([bam.sectionEditor]);
        bam.sectionEditor.growPart(newPart, function () {
            newdiv.style.zIndex = "auto";
        });
        newPart.ui.readOnly = false;
        newPart.ui.draw(undefined, 0.80 * bam.bbody.clientWidth, bam.windowHeight - newPart.canvas.offsetTop - 15);
    };

    var bassButton = document.createElement("div");
    bassButton.className = "remixer-add-button";
    bassButton.innerHTML = "Add <br/>Bassline";
    buttonGroup.appendChild(bassButton);
    bassButton.onclick = function () {

        var newdiv = bam.createElementOverElement("part2", bassButton, bam.bbody);

        var newPart = new OMGPart(newdiv, null, bam.section);
        bam.player.loadPart(newPart);
        newPart.data.partType = "BASSLINE";
        newPart.data.soundsetURL = "PRESET_BASS";
        newPart.data.soundsetURL = "PRESET_OSC_SAW";
        newPart.data.surface = {
            "url": "PRESET_VERTICAL",
            "skipTop": 25,
            "skipBottom": 15
        };

        //var otherParts = [bam.section.chordsView];
        var otherParts = [];
        var otherPartsList = bam.section.div.getElementsByClassName("part2");
        for (var ii = 0; ii < otherPartsList.length; ii++) {
            otherParts.push(otherPartsList.item(ii));
        }
        bam.fadeOut(otherParts);

        bam.section.div.appendChild(newdiv);
        newdiv.style.display = "block";
        newdiv.style.zIndex = "1";
        bam.part = newPart;

        bam.setupPartDiv(newPart);

        bam.fadeOut([bam.sectionEditor]);
        bam.sectionEditor.growPart(newPart, function () {
            newdiv.style.zIndex = "auto";
        });
        newPart.ui.readOnly = false;
        newPart.ui.draw(undefined, 0.80 * bam.bbody.clientWidth, bam.windowHeight - newPart.canvas.offsetTop - 15);
    };

    var drumButton = document.createElement("div");
    drumButton.className = "remixer-add-button";
    drumButton.innerHTML = "Add <br/>Drumbeat";
    buttonGroup.appendChild(drumButton);
    drumButton.onclick = function () {

        var newdiv = bam.createElementOverElement("part2", drumButton, bam.bbody);

        var newPart = new OMGPart(newdiv, OMGPart.prototype.defaultDrumPart(), bam.section);
        bam.player.loadPart(newPart);

        //var otherParts = [bam.section.chordsView];
        var otherParts = [];
        var otherPartsList = bam.section.div.getElementsByClassName("part2");
        for (var ii = 0; ii < otherPartsList.length; ii++) {
            otherParts.push(otherPartsList.item(ii));
        }
        bam.fadeOut(otherParts);

        bam.section.div.appendChild(newPart.div);
        newdiv.style.display = "block";
        bam.part = newPart;

        bam.setupPartDiv(newPart);

        bam.fadeOut([bam.sectionEditor]);
        bam.sectionEditor.growPart(newPart);

        newPart.ui.readOnly = false;
        newPart.ui.draw(undefined, 0.80 * bam.bbody.clientWidth, bam.windowHeight - newPart.canvas.offsetTop - 15);
    };

};

OMusicEditor.prototype.setupSongEditor = function () {
    var bam = this;

    bam.songEditor = document.createElement("div");
    bam.songEditor.className = "area";
    bam.bbody.appendChild(bam.songEditor);

    bam.songEditor.editPanel = document.createElement("div");
    bam.songEditor.removeButton = document.createElement("div");
    bam.songEditor.removeButton.className = "horizontal-panel-option";
    bam.songEditor.removeButton.id = "remove-section-button"; //maybe for css?
    bam.songEditor.removeButton.innerHTML = "Remove";
    bam.songEditor.editPanel.className = "song-edit-panel";
    bam.songEditor.editPanel.appendChild(bam.songEditor.removeButton);
    bam.bbody.appendChild(bam.songEditor.editPanel);

    bam.songEditor.sectionWidth = 150;

    bam.songEditor.playButtonClick = function () {
        if (bam.player.playing)
            bam.player.stop();
        else
            bam.player.play(bam.song);
    };

    bam.songEditor.playingSection = 0;

    //TODO remove this if it's not used?
    bam.songEditor.clearButtonClick = function () {
        if (bam.player.playing)
            bam.player.stop();

        var sections = bam.song.sections;
        for (i = 0; i < sections.length; i++) {
            bam.song.div.removeChild(sections[i].div);
            bam.song.sections.splice(i, 1);
            i--;
        }

        bam.songEditor.emptyMessage.style.display = "block";
    };



    bam.songEditor.addSectionButtonClick = function () {

        var lastSection = bam.song.sections[bam.song.sections.length - 1] || new OMGSection();
        bam.copySection(lastSection);
        bam.player.loopSection = bam.section.position;

        bam.songEditor.hide(bam.section, function () {
            //todo two animations simultaneously can't be perfomant
            bam.grow(bam.section.div);
            bam.arrangeParts(function () {
                bam.sectionEditor.show();
            });
        });

    };

    bam.songEditor.addSectionButton = document.createElement("div");
    bam.songEditor.addSectionButton.className = "section";
    bam.songEditor.addSectionButton.id = "add-section";
    bam.songEditor.addSectionButton.innerHTML = "+ Add Section";
    bam.songEditor.addSectionButton.style.top = "0px";
    bam.songEditor.addSectionButton.style.opacity = 0;
    bam.songEditor.appendChild(bam.songEditor.addSectionButton);
    if (bam.songEditor.addSectionButton) {
        bam.songEditor.addSectionButton.onclick = bam.songEditor.addSectionButtonClick;
    }


    bam.songEditor.nextButtonClick = function (saveCallback) {

        if (bam.player.playing)
            bam.player.stop();

        if (!bam.song.saved) {
            bam.song.data.previousId = bam.song.data.id;
            bam.song.data.id = undefined;
            bam.omgservice.post(bam.song.getData(), function (response) {
                if (response && response.id) {
                    bam.song.saved = true;
                    bam.song.data.id = response.id;
                    if (saveCallback) {
                        saveCallback();
                    }
                }
            });
        } else {
            if (saveCallback) {
                saveCallback();
            }
        }
    };

    bam.songEditor.hide = function (exceptSection, callback) {
        var fadeOutList = [bam.songEditor];
        bam.song.sections.forEach(function (section) {
            if (!exceptSection || exceptSection !== section) {
                fadeOutList.push(section.div);
            }
        });
        bam.fadeOut(fadeOutList, function () {
            if (exceptSection && exceptSection.beatmarker) {
                exceptSection.beatmarker.style.width = "0px";
            }
            if (callback) {
                callback();
            }
        });

    };

    bam.songEditor.show = function (exceptSection, callback) {

        var fadeInList = [bam.songEditor, bam.songEditor.addSectionButton];
        bam.song.sections.forEach(function (section) {
            if (section.beatMarker) {
                //
            }
            if (!exceptSection || exceptSection != section) {
                fadeInList.push(section.div);
            }
        });

        bam.fadeIn(fadeInList, callback);
        bam.arrangeSections();

        if (typeof bam.onzonechange == "function") {
            bam.onzonechange(bam.song);
        }
    };

    bam.songEditor.editSection = function (section, callback) {
        bam.section = section;
        bam.songEditor.hide(section, function () {
            bam.grow(section.div);
            bam.arrangeParts(function () {
                bam.player.loopSection = section.position;
                bam.sectionEditor.show(callback);
            });
        });
    };
};

OMusicEditor.prototype.cancelPart = function (part) {
    var bam = this;

    bam.pausePart(part);

    var partInArray = bam.section.parts.indexOf(part);
    if (partInArray > -1) {
        bam.section.parts.splice(partInArray, 1);

        if (bam.section.parts.length == 0) {
            bam.player.stop();
            bam.sectionEditor.nosection.style.display = "block";
        }
    }

    bam.section.div.removeChild(part.div);

    if (part.div.onBeatPlayedListener) {
        var index = bam.player.onBeatPlayedListeners
                .indexOf(part.div.onBeatPlayedListener);
        if (index > -1) {
            bam.player.onBeatPlayedListeners.splice(index, 1);
        }
        part.div.onBeatPlayedListener = undefined;
    }

};

OMusicEditor.prototype.pausePart = function (part) {
    var bam = this;
    if (part.osc && part.oscStarted) {

        fadeOut(part.gain.gain, function () {
            part.osc.stop(0);
            part.playingI = null;

            part.osc.disconnect(part.gain);

            part.gain.disconnect(bam.player.context.destination);
            part.oscStarted = false;
            part.osc = null;
        });

    }
};

// wasn't bam
OMusicEditor.prototype.needsMP3 = function () {
    var ua = navigator.userAgent.toLowerCase();
    var iOS = (ua.match(/(ipad|iphone|ipod)/g) ? true : false);
    var safari = ua.indexOf('safari') > -1 && ua.indexOf('chrome') == -1;
    return iOS || safari;
}


OMusicEditor.prototype.sectionModified = function () {
    this.section.id = -1;
}

OMusicEditor.prototype.getLoadParams = function () {

    // see if there's somethign to do here
    var rawParams = document.location.search;
    var nvp;
    var params = {}

    if (rawParams.length > 1) {
        rawParams.slice(1).split("&").forEach(function (param) {
            nvp = param.split("=");
            params[nvp[0]] = nvp[1];
        });
    }
    return params;
};

// this was a pretty large function, still big though
OMusicEditor.prototype.load = function (params) {
    var bam = this;

    //hmmmm, why is this does here?
    if (!bam.windowWidth || bam.windowWidth < 0) {
        bam.windowWidth = bam.bbody.clientWidth;
        bam.windowHeight = bam.bbody.clientHeight;
        //bam.offsetLeft = bam.bbody.offsetLeft;
        //TODO figure out how mobile is used and if still needed
        bam.mobile = bam.windowWidth < 1000;
    }

    if (params.dataToLoad && params.dataToLoad.type) {
        params.type = params.dataToLoad.type;
    }
    if (params.type) {
        params.type = params.type.toUpperCase();
    } else {
        params.type = "MELODY";
        params.welcome = true;
    }

    // to make the beginning as pretty as possible (no weird flickers)
    // we whiteout the container divs and add their color after 
    // the current zone is setup
    var songBG;
    var sectionBG;
    var restoreColors = function () {
        if (bam.song)
            bam.song.div.style.backgroundColor = songBG;
        if (bam.section)
            bam.section.div.style.backgroundColor = sectionBG;
    };

    var songDiv = bam.div.getElementsByClassName("song")[0];
    bam.zones.push(songDiv);

    if (params.type == "SONG") {
        //bam.fadeIn([songDiv, bam.songEditor, bam.songEditor.addSectionButton], restoreColors);
        params.songDiv = songDiv;
        bam.loadSong(params, restoreColors);
        return;
    }

    bam.song = new OMGSong(songDiv);
    bam.player.prepareSong(bam.song);

    var newDiv = document.createElement("div");
    newDiv.className = "section";
    bam.song.div.appendChild(newDiv);
    bam.zones.push(newDiv);

    songBG = window.getComputedStyle(bam.song.div, null).backgroundColor;
    bam.song.div.style.backgroundColor = "white";
    bam.song.div.style.display = "block";

    if (params.type == "SECTION") {
        params.sectionDiv = newDiv;
        params.callback = restoreColors;
        bam.loadSection(params);
        return;
    }

    bam.section = new OMGSection(newDiv, null, bam.song);
    //bam.makeChordsView(bam.section);

    sectionBG = window.getComputedStyle(bam.section.div, null).backgroundColor;
    bam.section.div.style.backgroundColor = "white";
    bam.section.div.style.display = "block";

    newDiv = document.createElement("div");
    newDiv.className = "part2";
    bam.section.div.appendChild(newDiv);
    bam.zones.push(newDiv);

    var loadPartCallback = function () {
        restoreColors();
        bam.initialized = true;
    };
    if (params.type == "DRUMBEAT" ||
            (params.dataToLoad && params.dataToLoad.partType == "DRUMBEAT")) {
        if (params.dataToLoad) {
            bam.part = new OMGPart(newDiv, params.dataToLoad, bam.section);
        } else {
            bam.part = new OMGPart(newDiv, OMGPart.prototype.defaultDrumPart(), bam.section);
            var ppart = bam.part;
            if (params.soundset) {
                bam.getSoundSet(params.soundset, function (ss) {
                    bam.player.setupDrumPartWithSoundSet(ss, ppart, true);
                });
            }
        }
    } else {
        if (params.dataToLoad) {
            bam.part = new OMGPart(newDiv, params.dataToLoad, bam.section);
        } else {
            bam.part = new OMGPart(newDiv, null, bam.section);
            bam.part.data.partType = params.type;
            bam.part.data.surface = {
                "url": "PRESET_VERTICAL",
                "skipTop": 14,
                "skipBottom": 25
            };

        }
    }

    bam.setupPartDiv(bam.part);
    bam.part.div.style.display = "block";
    bam.part.canvas.style.marginLeft = "10%";
    bam.part.canvas.style.width = "80%";
    bam.part.canvas.style.height = bam.windowHeight - 
                        bam.part.canvas.offsetTop - 15 + "px";

    bam.part.ui.readOnly = false;

    bam.fadeIn([bam.part.div], function () {
        loadPartCallback();
        bam.part.ui.draw();
    });
    bam.player.loadPart(bam.part);

    if (typeof bam.onzonechange === "function")
        bam.onzonechange(bam.part);

    bam.refreshKeyTempoChordsButtons();
};

OMusicEditor.prototype.loadSong = function (params, callback) {
    var bam = this;
    if (params.dataToLoad) {
        bam.song = new OMGSong(params.songDiv, params.dataToLoad);
        var newSection;
        //var fadeInList = [bam.songEditor.addSectionButton];
        //var fadeInList = [];
        var fadeInList = [params.songDiv, bam.songEditor, bam.songEditor.addSectionButton];
        bam.song.sections.forEach(function (section) {
            fadeInList.push(bam.makeSectionDiv(section));
            section.parts.forEach(function (part) {
                bam.setupPartDiv(part);
            });
        });
        bam.player.prepareSong(bam.song);
        bam.arrangeSections(function () {
            if (params.section) {
                bam.editSectionOnLoad(params);
            } else {
                bam.initialized = true;
            }
        }, 1); //last parameter makes it super fast
        bam.fadeIn(fadeInList);
    }
    bam.player.loopSection = -1;

    //if (!params.section && typeof bam.onzonechange == "function") {
    if (typeof bam.onzonechange == "function") {
        //needs this because songEditor.show() isn't called
        bam.onzonechange(bam.song);
    }

    bam.refreshKeyTempoChordsButtons();
};

OMusicEditor.prototype.editSectionOnLoad = function (params) {
    var bam = this;
    bam.song.sections.forEach(function (section) {
        if (params.section == section.data.id) {
            bam.songEditor.editSection(section, function () {
                if (params.part) {
                    bam.editPartOnLoad(params);
                } else {
                    bam.initialized = true;
                }
            });
        }
    });
};

OMusicEditor.prototype.editPartOnLoad = function (params) {
    var bam = this;
    bam.section.parts.forEach(function (part) {
        if (params.part == part.data.id) {
            bam.sectionEditor.editPart(part, function () {
                bam.initialized = true;    
            });
        }
    });
};

OMusicEditor.prototype.loadSection = function (params) {
    var bam = this;

    var newPart;
    var fadeIn = [params.sectionDiv, bam.sectionEditor];
    if (params.dataToLoad) {
        bam.section = new OMGSection(params.sectionDiv, params.dataToLoad, bam.song);
        //bam.makeChordsView(bam.section);

        for (var ip = 0; ip < bam.section.parts.length; ip++) {
            newPart = bam.makePartDiv(bam.section.parts[ip]);
            if (newPart)
                fadeIn.push(newPart.div);
        }
        var sectionBeats = bam.section.data.beatParams;
        if (sectionBeats) {
            var songBeats = bam.song.data.beatParams;
            if (sectionBeats.beats)
                songBeats.beats = sectionBeats.beats;
            if (sectionBeats.subbeats)
                songBeats.subbeats = sectionBeats.subbeats;
            if (sectionBeats.measures)
                songBeats.measures = sectionBeats.measures;
            if (sectionBeats.subbeatMillis)
                songBeats.subbeatMillis = sectionBeats.subbeatMillis;
        }
        
        var sectionKey = bam.section.data.keyParams;
        if (sectionKey) {
            var songKey = bam.song.data.keyParams;
            if (sectionKey.scale)
                songKey.scale = sectionKey.scale;
            if (typeof sectionKey.rootNote === "number")
                songKey.rootNote = sectionKey.rootNote;
        }
    } else {
        bam.section = new OMGSection(params.sectionDiv, null, bam.song);
    }
    //bam.makeChordsView(bam.section);

    bam.fadeIn(fadeIn, params.callback);
    bam.arrangeParts(function () {
        if (params.part) {
            bam.editPartOnLoad(params);
        } else {
            bam.initialized = true;
        }
    });

    if (typeof bam.onzonechange == "function") {
        bam.onzonechange(bam.section);
    }

    bam.refreshKeyTempoChordsButtons();
}

OMusicEditor.prototype.clear = function () {
    var bam = this;

    if (bam.player.playing) {
        bam.player.stop();
    }

    bam.songEditor.style.display = "none";
    bam.sectionEditor.style.display = "none";
    //bam.mm.style.display = "none";

    bam.song.div.innerHTML = "";
    bam.section = undefined;
    bam.part = undefined;
};

OMusicEditor.prototype.toggleMute = function (part, newMute) {
    if (newMute == undefined) {
        newMute = !part.data.mute;
    }
    if (newMute) {
        part.data.mute = true;

        part.div.style.backgroundColor = this.mutedPartColor;

        if (part.gain) {
            part.preMuteGain = part.gain.gain.value;
            part.gain.gain.value = 0;
        }
    } else {
        part.data.mute = false;

        part.div.style.backgroundColor = part.originalBackgroundColor;

        if (part.gain && part.preMuteGain) {
            part.gain.gain.value = part.preMuteGain;
        }
    }
};




function fadeOut(gain, callback) {

    var level = gain.value;
    var dpct = 0.015;
    var interval = setInterval(function () {
        if (level > 0) {
            level = level - dpct;
            gain.setValueAtTime(level, 0);
        } else {
            clearInterval(interval);

            if (callback)
                callback();
        }
    }, 1);
}


function rescale(part, rootNote, scale) {

    var octaveShift = part.data.octave || part.data.octaveShift;
    var octaves2;
    if (isNaN(octaveShift))
        octaveShift = part.data.type == "BASSLINE" ? 3 : 5;
    var newNote;
    var onote;
    var note;
    for (var i = 0; i < part.data.notes.length; i++) {
        octaves2 = 0;

        onote = part.data.notes[i];
        newNote = onote.note;
        while (newNote >= scale.length) {
            newNote = newNote - scale.length;
            octaves2++;
        }
        while (newNote < 0) {
            newNote = newNote + scale.length;
            octaves2--;
        }

        newNote = scale[newNote] + octaves2 * 12 + octaveShift * 12 + rootNote;

        onote.scaledNote = newNote;
    }

}

OMusicEditor.prototype.getSelectInstrumentOptions = function (partData) {
    var type = partData;
    var select = "";
    if (type == "BASSLINE") {
        select += "<option value='DEFAULT'>Saw Wave</option>";
    } else if (type == "MELODY") {
        select += "<option value='DEFAULT'>Sine Wave</option>";
    } else if (type == "DRUMBEAT") {
        select += "<option value='PRESET_HIPKIT'>Hip Hop Drum Kit</option>";
        select += "<option value='PRESET_ROCKKIT'>Rock Drum Kit</option>";
    }

    var hasThisSoundSet = false;
    this.soundsets.forEach(function (soundset) {
        select += "<option value='" + soundset.url + "'>" +
                soundset.name + "</option>";
        if (soundset.url === partData.soundsetURL)
            hasThisSoundSet = true;
    });
    if (!hasThisSoundSet && partData.soundsetURL) {
        select += "<option value='" + partData.soundsetURL + "'>" +
                partData.soundsetName + "</option>";        
    }

    return select;

};

function debug(out) {
    console.log(out);
}

/* bam components */

OMusicEditor.prototype.setupMelodyMaker = function () {
    var bam = this;

    /*bam.mm = document.createElement("div");
    bam.mm.className = "area";
    bam.bbody.appendChild(bam.mm);

    var canvas = document.createElement("canvas");
    bam.mm.appendChild(canvas);

    canvas.style.width = "80%";
    canvas.style.marginLeft = "10%";
    bam.mm.canvas = canvas;

    bam.mm.ui = new OMGMelodyMaker(canvas, undefined, bam.player);
    bam.mm.ui.highContrast = false;

    bam.mm.setSize = function (width, height) {
        if (width == undefined) {
            width = canvas.clientWidth;
        }
        if (height == undefined) {
            height = bam.windowHeight - canvas.offsetTop - 15;
        }

        bam.mm.ui.setSize(width, height);
    };

    bam.mm.setSize();

    bam.mm.ui.hasDataCallback = function () {
        //TODO if the welcome screen is up, this should fade in the the controls
        //actually, should be a callback to music-maker, cause this file shouldn't know
        //what the external controls are
    };

    bam.mm.setPart = function (part, welcomeStyle) {

        bam.mm.ui.setPart(part, welcomeStyle);

        if (typeof bam.onzonechange == "function") {
            bam.onzonechange(part);
        }
    };
    */
    bam.mm = {};
    bam.mm.playButtonClick = function () {
        if (bam.player.playing) {
            bam.player.stop();
            return;
        }
        bam.player.play();
    };

    bam.mm.nextButtonClick = function () {

        var part = bam.part;

        var type = bam.part.data.type;
        var surface = bam.part.data.surface.url;

        if (bam.sectionEditor.mixerMode) {
            bam.sectionEditor.dragAndDrop.setupChildDiv(part.div);
        }

        if (!part.saved) {
            bam.section.saved = false;
            part.data.previousId = part.data.id;
            part.data.id = undefined;
            part.saving = true;
            bam.omgservice.post(part.data, function (response) {
                if (response && response.id) {
                    part.saved = true;
                } else {
                    debug(response);
                }
                part.saving = false;
            });

            //TODO THIS NEEDS TO CHECK TO SEE IF THE USER IS LOGGED IN

        }

        var shrinkPart = function () {
            if (typeof bam.onzonechange == "function") {
                bam.onzonechange(bam.section);
            }
            part.div.style.zIndex = "1";

            bam.popZone(bam.part.div);
            bam.setupPartDiv(part);

            bam.fadeOut([bam.part.ui.bgCanvas]);

            var otherParts = [];
            var otherPart;
            var otherPartsList = bam.section.div
                    .getElementsByClassName("part2");
            for (var ii = 0; ii < otherPartsList.length; ii++) {
                otherPart = otherPartsList.item(ii)
                if (bam.part.div != otherPart) {
                    otherParts.push(otherPart);
                }
            }

            otherParts.push(bam.sectionEditor);
            //otherParts.push(bam.section.chordsView);
            bam.fadeIn(otherParts);

            bam.arrangeParts();
        };

        bam.part.ui.readOnly = true;
        if (surface == "PRESET_SEQUENCER") {
            bam.part.ui.selectedTrack = -1;
        }
        shrinkPart();
    };

    //TODO not used, use it, or lose it
    bam.mm.clearButtonClick = function () {
        if (bam.part.data.type == "DRUMBEAT") {
            var track;
            for (var i = 0; i < bam.part.data.tracks.length; i++) {
                track = bam.part.data.tracks[i];
                for (var j = 0; j < track.data.length; j++) {
                    track.data[j] = 0;
                }
            }
        } else {
            bam.part.data.notes = [];
            bam.mm.lastNewNote = 0;
            bam.mm.ui.canvas.mode = "APPEND";
            bam.mm.ui.draw();

        }
    };
};

/* bam ui stuff */
OMusicEditor.prototype.popZone = function (div) {
    var bam = this;

    // remove us from the zone hierarchy
    bam.zones.pop();

    div.style.borderWidth = "1px";
    div.style.borderRadius = bam.borderRadius + "px";
    div.style.cursor = "pointer";

};

OMusicEditor.prototype.grow = function (div, callback, children) {
    var bam = this;

    bam.zones.push(div);

    if (div.captionDiv)
        div.captionDiv.style.display = "none";

    var originalH = div.clientHeight;
    var originalW = div.clientWidth;
    var originalX = div.offsetLeft;
    var originalY = div.offsetTop;
    
    if (children) {
        children.forEach(function (child) {
            child.originalH = child.div.clientHeight;
            child.originalW = child.div.clientWidth;
            child.originalX = child.div.offsetLeft;
            child.originalY = child.div.offsetTop;
        });
    }

    var startedAt = Date.now();

    // mainly if the song is slid left, the section needs to be the in right spot
    var leftOffset = 0;
    if (div.parentElement && div.parentElement.offsetLeft < 0) {
        leftOffset = -1 * div.parentElement.offsetLeft;
    }

    var interval = setInterval(function () {
        var now = Date.now() - startedAt;
        var now = Math.min(1, now / bam.animLength);

        div.style.left = originalX + (leftOffset - originalX) * now + "px";
        div.style.top = originalY + (0 - originalY) * now + "px";

        div.style.width = originalW + (bam.windowWidth - originalW)
                * now + "px";
        div.style.height = originalH + (bam.windowHeight - originalH)
                * now + "px";


        if (children) {
            children.forEach(function (child) {
                child.div.style.marginLeft = child.originalX + (child.targetX - child.originalX) * now + "px";
                child.div.style.top = child.originalY + (0 - child.originalY) * now + "px";

                child.width = child.originalW + (child.targetW - child.originalW) * now;
                child.height = child.originalH + (child.targetH - child.originalH) * now;
                child.div.style.width = child.width + "px";
                child.div.style.height = child.height + "px";
                
                if (child.canvas) {
                    console.log("grow child canvas");
                    child.canvas.style.width = child.width + "px";
                    child.canvas.style.height = child.height + "px";
                    //child.canvas.width = child.width;
                    //child.canvas.height = child.height;
                    if (child.canvas.update) {
                        //child.canvas.update(child.width, child.height);
                    }
                }
            });
        }

        if (now == 1) {
            clearInterval(interval);
            div.style.borderWidth = "0px";
            div.style.borderRadius = "0px";
            div.style.cursor = "auto";
            if (callback)
                callback();
        }
    }, 1000 / 60);
};


OMusicEditor.prototype.arrangeParts = function (callback) {
    var bam = this;

    var div = bam.section.div;

    if (bam.section.parts.length == 0) {
        bam.sectionEditor.nosection.style.display = "block";
    } else {
        bam.sectionEditor.nosection.style.display = "none";
    }

    var children = [];
    var child;

    var top = bam.offsetTop + bam.chordsViewHeight; //bam.mobile ? 60 : 88; 
    var height = bam.mobile ? 75 : 105;
    var width = Math.min((bam.windowWidth - bam.offsetLeft) * 0.7);

    if (bam.sectionEditor.mixerMode) {
        width = height;
        height = height * 0.8;
    }

    var spaceBetween = 18;

    var extraRows = 0.2; //bam.mobile ? 2.7 : 1;
    if (top + (height + spaceBetween) * (bam.section.parts.length + extraRows) > bam.windowHeight) {
        height = (bam.windowHeight - top) / (bam.section.parts.length + extraRows);
        spaceBetween = height * 0.1;
        height = height * 0.9;
    }
    top = top + spaceBetween;

    /*child = {
        div: bam.section.chordsView
    };
    child.originalH = child.div.clientHeight;
    child.originalW = child.div.clientWidth;
    child.originalX = child.div.offsetLeft;
    child.originalY = child.div.offsetTop;
    child.targetX = bam.bbody.clientWidth * 0.1; //bam.offsetLeft;
    child.targetY = bam.offsetTop;
    child.targetW = width;
    child.targetH = bam.chordsViewHeight;
    children.push(child);*/

    var volume, pan;
    //var parts = div.getElementsByClassName("part2");
    var parts = bam.section.parts;
    for (let ip = 0; ip < parts.length; ip++) {
        child = {
            //div: parts.item(ip)
            div: parts[ip].div,
            canvas: parts[ip].canvas
        };
        child.originalH = child.div.clientHeight;
        child.originalW = child.div.clientWidth;
        child.originalX = child.div.offsetLeft;
        child.originalY = child.div.offsetTop;

        if (bam.sectionEditor.mixerMode) {
            volume = bam.section.parts[ip].data.volume || 0.6;
            pan = bam.section.parts[ip].data.pan || 0;
            child.targetX = bam.windowWidth * (pan / 2 + 0.5) - width / 2; //;
            child.targetY = bam.windowHeight * (1 - volume) - height / 2;
        } else {
            child.targetX = bam.bbody.clientWidth * 0.1; //bam.offsetLeft;
            child.targetY = top + ip * (height + spaceBetween);
        }
        child.targetW = width;
        child.targetH = height;

        child.canvasOriginalX = child.canvas.offsetLeft;
        child.canvasOriginalW = child.canvas.clientWidth;
        child.update = () => {
            parts[ip].ui.draw();
        };

        children.push(child);
        
    }

    child = {
        div: bam.sectionEditor.nosection
    };
    child.originalH = child.div.clientHeight;
    child.originalW = child.div.clientWidth;
    child.originalX = child.div.offsetLeft;
    child.originalY = child.div.offsetTop;
    child.targetH = child.div.clientHeight;
    child.targetW = bam.bbody.clientWidth;
    child.targetX = bam.bbody.clientWidth * 0.1;
    child.targetY = child.div.offsetTop;
    children.push(child);



    if (bam.sectionEditor.addButtons) {
        child = {
            div: bam.sectionEditor.addButtons
        };
        child.originalH = child.div.clientHeight;
        child.originalW = child.div.clientWidth;
        child.originalX = bam.bbody.clientWidth * 0.9 - 140;
        child.originalY = child.div.offsetTop;
        child.targetX = bam.bbody.clientWidth * 0.9 - 140;
        child.targetY = 0;
        child.targetW = 50; //child.div.clientWidth;
        child.targetH = child.div.clientHeight;
        children.push(child);
    }

    var startedAt = Date.now();

    var interval = setInterval(function () {
        var now = Date.now() - startedAt;
        var now = Math.min(1, now / bam.animLength);
        var cwidth, cheight;

        for (ip = 0; ip < children.length; ip++) {
            child = children[ip];
            child.div.style.left = child.originalX
                    + (child.targetX - child.originalX) * now + "px";
            child.div.style.top = child.originalY
                    + (child.targetY - child.originalY) * now + "px";

            cwidth = child.originalW + (child.targetW - child.originalW) * now;
            cheight = child.originalH + (child.targetH - child.originalH) * now
            child.div.style.width = cwidth + "px";
            child.div.style.height = cheight + "px";

            if (child.canvas) {
                cwidth = child.canvasOriginalW + (child.targetW - child.canvasOriginalW) * now;
                child.canvas.style.width = cwidth + "px";
                child.canvas.style.height = cheight - child.canvas.offsetTop + "px";
                child.canvas.style.marginLeft = child.canvasOriginalX
                                - child.canvasOriginalX * now + "px";

                //child.update();
                //child.updateOMGUI(child, now);                
            }
        }

        if (now == 1) {
            for (var ip = 0; ip < parts.length; ip++) {
                //parts.item(ip).style.zIndex = "auto";
                parts[ip].div.style.zIndex = "auto";
            }
    
            clearInterval(interval);
            if (callback)
                callback();
        }
    }, 1000 / 60);
};



OMusicEditor.prototype.arrangeSections = function (callback, animLength) {
    var bam = this;

    if (bam.arrangeSectionsHandle > 0) {
        clearInterval(bam.arrangeSectionsHandle);
        bam.arrangeSectionsHandle = 0;
    }

    var div = bam.song.div;

    if (!bam.song.slidLeft)
        bam.song.slidLeft = 0;

    var children;
    var child;
    var grandchild;
    var partCanvas;

    var top = bam.offsetTop;

    var windowHeight = bam.windowHeight || window.innerHeight;

    //var height = Math.min(300, windowHeight - top - 50);
    var height = windowHeight - top - 100;

    var sectionWidth = bam.songEditor.sectionWidth;

    children = [];
    var parts;
    var sections = bam.song.sections;
    for (var ip = 0; ip < sections.length; ip++) {
        sections[ip].position = ip;
        child = {
            div: sections[ip].div
        };
        child.originalH = child.div.clientHeight;
        child.originalW = child.div.clientWidth;
        child.originalX = child.div.offsetLeft;
        child.originalY = child.div.offsetTop;

        child.targetX = bam.offsetLeft + ip * (10 + sectionWidth);
        child.targetY = top;
        child.targetW = sectionWidth;
        child.targetH = height;

        children.push(child);
        if (!sections[ip].partsAreClean) {
            sections[ip].partsAreClean = true;

            child.children = [];
            parts = child.div.getElementsByClassName("part2");
            
            /*grandchild = {
                div: sections[ip].chordsView
            };
            grandchild.originalH = grandchild.div.clientHeight;
            grandchild.originalW = grandchild.div.clientWidth;
            grandchild.originalX = grandchild.div.offsetLeft;
            grandchild.originalY = grandchild.div.offsetTop;
            bam.setTargetsSmallParts(grandchild, -1, parts.length, //-1 for chordsView
                child.targetW, child.targetH, sectionWidth);
            child.children.push(grandchild);*/

            for (var ipp = 0; ipp < parts.length; ipp++) {
                grandchild = {
                    div: parts.item(ipp)
                };
                grandchild.originalH = grandchild.div.clientHeight;
                grandchild.originalW = grandchild.div.clientWidth;
                grandchild.originalX = grandchild.div.offsetLeft;
                grandchild.originalY = grandchild.div.offsetTop;

                bam.setTargetsSmallParts(grandchild, ipp, parts.length, child.targetW, child.targetH, sectionWidth);
                child.children.push(grandchild);

                grandchild.canvasHolder = grandchild.div.getElementsByClassName("canvas-holder").item(0);
            }
        }
    }

    if (bam.songEditor.addSectionButton) {
        child = {
            div: bam.songEditor.addSectionButton
        };
        child.originalH = child.div.clientHeight - 100; // padding does the rest;
        child.originalW = 60; // padding does the rest;
        child.originalX = child.div.offsetLeft;
        child.originalY = child.div.offsetTop;
        child.targetX = bam.offsetLeft + 5 + bam.song.sections.length * (10 + sectionWidth) - bam.song.slidLeft;
        child.targetY = bam.offsetTop;
        child.targetW = child.originalW;

        child.targetH = height - 100;
        children.push(child);
    }

    var startedAt = Date.now();

    if (!animLength)
        animLength = bam.animLength;

    var intervalFunction = function () {
        var now = Date.now() - startedAt;
        now = Math.min(1, now / animLength);

        for (var ip = 0; ip < children.length; ip++) {
            child = children[ip];
            child.div.style.left = child.originalX
                    + (child.targetX - child.originalX) * now + "px";
            child.div.style.top = child.originalY
                    + (child.targetY - child.originalY) * now + "px";
            child.div.style.width = child.originalW
                    + (child.targetW - child.originalW) * now + "px";
            child.div.style.height = child.originalH
                    + (child.targetH - child.originalH) * now + "px";

            if (child.children) {
                var gchild, gwidth, gheight;
                for (var ipp = 0; ipp < child.children.length; ipp++) {
                    gchild = child.children[ipp];
                    gchild.div.style.left = gchild.originalX
                            + (gchild.targetX - gchild.originalX) * now + "px";
                    gchild.div.style.top = gchild.originalY
                            + (gchild.targetY - gchild.originalY) * now + "px";
                    gwidth = gchild.originalW + (gchild.targetW - gchild.originalW) * now;
                    gheight = gchild.originalH + (gchild.targetH - gchild.originalH) * now;

                    gchild.div.style.width = gwidth + "px"
                    gchild.div.style.height = gheight + "px";

                    if (gchild.canvasHolder) {
                        gchild.canvasHolder.style.width = gwidth + "px";
                        gchild.canvasHolder.style.height = gheight + "px";
                    }
                    if (gchild.canvas) {
                        gchild.canvas.style.width = gwidth + "px";
                        gchild.canvas.style.height = gheight + "px";
                        gchild.canvas.width = gwidth;
                        gchild.canvas.height = gheight;

                        if (gchild.canvas.update)
                            gchild.canvas.update(gwidth, gheight);

                    }
                }

            }
        }

        if (now == 1) {
            clearInterval(interval);
            if (callback)
                callback();
        }
    };

    var interval = setInterval(intervalFunction, 1000 / 60);
    bam.arrangeSectionsHandle = interval;
};


OMusicEditor.prototype.fadeOut = function (divs, callback) {
    var bam = this;

    for (var ii = 0; ii < divs.length; ii++) {
        bam.fadingOut.push(divs[ii]);
        divs[ii].cancelFadeOut = false;
    }

    var startedAt = Date.now();

    var interval = setInterval(function () {

        var now = Date.now() - startedAt;
        now = Math.min(1, now / bam.animLength);

        for (var ii = 0; ii < divs.length; ii++) {
            if (!divs[ii].cancelFadeOut) {
                divs[ii].style.opacity = 1 - now;
            }
        }

        if (now == 1) {
            var foI;
            for (var ii = 0; ii < divs.length; ii++) {
                if (!divs[ii].cancelFadeOut) {
                    divs[ii].style.display = "none";
                }

                foI = bam.fadingOut.indexOf(divs[ii]);
                if (foI > -1) {
                    bam.fadingOut.splice(foI, 1);
                }
            }

            clearInterval(interval);
            if (callback) {
                callback();
            }
        }
    }, 1000 / 60);
};

OMusicEditor.prototype.fadeIn = function (divs, callback) {
    var bam = this;

    var fadingOutI;
    var startedAt = Date.now();
    var div;
    for (var ii = 0; ii < divs.length; ii++) {
        div = divs[ii];

        if (!div) {
            divs.splice(ii, 1);
            ii--;
            continue;
        }

        div.style.opacity = 0
        div.style.display = "block";

        //quick way to avoid a fadeout display=none'ing a div
        // a fadeout finishing mid fadein
        fadingOutI = bam.fadingOut.indexOf(div);
        if (fadingOutI > -1) {
            div.cancelFadeOut = true;
        }
    }

    var interval = setInterval(function () {

        var now = Date.now() - startedAt;
        now = Math.min(1, now / bam.animLength);

        for (var ii = 0; ii < divs.length; ii++) {
            divs[ii].style.opacity = now;
        }

        if (now == 1) {
            clearInterval(interval);

            if (callback)
                callback();

        }
    }, 1000 / 60);
};

OMusicEditor.prototype.createElementOverElement = function (classname, button, parent) {
    var offsets = omg.ui.totalOffsets(button, parent)

    var newPartDiv = document.createElement("div");
    newPartDiv.className = classname;

    newPartDiv.style.left = offsets.left + "px";
    newPartDiv.style.top = offsets.top + "px";
    newPartDiv.style.width = button.clientWidth + "px";
    newPartDiv.style.height = button.clientHeight + "px";

    newPartDiv.style.borderRadius = this.borderRadius + "px";
    newPartDiv.style.borderWidth = "1px";
    return newPartDiv;
};

OMusicEditor.prototype.copySection = function (section) {
    var bam = this;
    var targets;

    var newDiv = bam.createElementOverElement("section",
            bam.songEditor.addSectionButton, bam.bbody);
    var newSection = new OMGSection(newDiv, null, bam.song);
    if (section.data.chordProgression) {
        newSection.data.chordProgression = section.data.chordProgression.slice(0);
    }
    //bam.makeChordsView(newSection);
    bam.song.div.appendChild(newDiv);

    newDiv.style.left = bam.songEditor.addSectionButton.offsetLeft + //bam.offsetLeft + 
            bam.song.slidLeft + "px";

    newSection.div.style.borderWidth = "1px";
    newSection.div.style.borderRadius = bam.borderRadius + "px";

    bam.fadeIn([newDiv]);

    /*targets = bam.setTargetsSmallParts(null, -1, section.parts.length,
            newDiv.clientWidth, newDiv.clientHeight);
    bam.reachTarget(newSection.chordsView, targets)*/
    var newPartDiv;
    var newPart;

    for (var ip = 0; ip < section.parts.length; ip++) {
        newPartDiv = document.createElement("div");
        newPartDiv.className = "part2";
        newPartDiv.style.display = "block";
        newPartDiv.style.borderWidth = "1px";
        newPartDiv.style.borderRadius = bam.borderRadius + "px";
        newDiv.appendChild(newPartDiv);

        targets = bam.setTargetsSmallParts(null, ip, section.parts.length,
                newDiv.clientWidth, newDiv.clientHeight);

        newPart = new OMGPart(newPartDiv, null, newSection);

        bam.reachTarget(newPartDiv, targets);

        newPart.data = JSON.parse(JSON.stringify(section.parts[ip].data));

        bam.setupPartDiv(newPart);
        
        bam.player.loadPart(newPart);
        newPart.ui.bgCanvas.style.display = "none";
        newPart.ui.draw(undefined, 0.80 * bam.bbody.clientWidth, bam.windowHeight - newPart.canvas.offsetTop - 15);
    }

    bam.section = newSection;
    bam.setupSectionDiv(newSection);

    return newSection;
};

OMusicEditor.prototype.setTargetsSmallParts = function (targets, partNo, partCount, w, h, sectionWidth) {
    var bam = this;
    if (!targets)
        targets = {};

    //imma just do this
    w = sectionWidth || 100;
    h = h || 300;
    
    var marginY = h / partCount * 0.1;

    targets.targetX = 15;
    targets.targetW = w - 30 - 4; // margin and padding
    if (partNo === -1) {
        //targets.targetY = 10; // + partNo * (h - 15) / partCount;
        targets.targetY = marginY;
        targets.targetH = bam.chordsViewHeight - 8; //8px margin-top; //(h - 15) / partCount - 15;
    }
    else {
        //targets.targetY = 20 + bam.chordsViewHeight + partNo * (h - 20 - bam.chordsViewHeight) / partCount;
        //targets.targetH = (h - 20 - bam.chordsViewHeight) / partCount - 10;        
        targets.targetY = marginY * 2 + bam.chordsViewHeight + partNo * (h - marginY * 2 - bam.chordsViewHeight) / partCount;
        targets.targetH = (h - marginY * 2 - bam.chordsViewHeight) / partCount - marginY;        
    }
    return targets;
}

OMusicEditor.prototype.reachTarget = function (div, target) {
    div.style.left = target.targetX + "px";
    div.style.top = target.targetY + "px";
    div.style.width = target.targetW + "px";
    div.style.height = target.targetH + "px";
};

OMusicEditor.prototype.setupSectionDiv = function (section) {
    var bam = this;

    if (!section.div) {

    }

    //todo we should not do this here, we still want to allow scrolling
    if (bam.readOnly) {
        return;
    }

    section.setup = true;

    section.div.style.cursor = "pointer";

    var addButton = bam.songEditor.addSectionButton;
    var removeButton = bam.songEditor.removeButton;
    var editPanel = bam.songEditor.editPanel;

    var downTimeout;

    var lastXY = [-1, -1];
    var overCopy = false;
    var overRemove = false;
    section.div.onmousedown = function (event) {
        event.preventDefault();
        section.div.ondown(event.clientX, event.clientY);
    };
    section.div.ontouchstart = function (event) {
        event.preventDefault();
        section.div.ondown(event.targetTouches[0].pageX, event.targetTouches[0].pageY);
    };

    section.div.ondown = function (x, y) {
        if (bam.zones[bam.zones.length - 1] != bam.song.div) {
            return;
        }

        bam.song.firstX = x;
        bam.song.lastX = x;

        bam.song.doClick = true;

        bam.startSongSliding();

        // if 250 ms go by with little movement, cancel the click
        // and move the individual section instead of all       
        downTimeout = setTimeout(function () {

            bam.song.doClick = false;

            if (Math.abs(bam.song.lastX - bam.song.firstX) < 15) {

                bam.song.div.sliding = false;
                bam.setOnMove(bam.song.div, undefined);
                bam.setOnUp(bam.song.div, undefined);

                dragOneSection();
            }

        }, 250);

        var dragOneSection = function () {
            section.dragging = true;
            section.div.style.zIndex = "1";

            addButton.innerHTML = "(Copy Section)";

            bam.fadeIn([editPanel]);

            section.doneDragging = function () {
                addButton.innerHTML = "+ Add Section";
                addButton.style.backgroundColor = section.div.style.backgroundColor;
                section.dragging = false;
                overCopy = false;

                bam.arrangeSections(function () {
                    section.div.style.zIndex = "0";
                });

                bam.fadeOut([editPanel]);
                bam.song.div.onmousemove = undefined;
                bam.song.div.ontouchmove = undefined;

            };
            bam.song.div.onmousemove = function (event) {
                bam.song.div.onmove([event.clientX, event.clientY]);
            };
            bam.song.div.ontouchmove = function (e) {
                bam.song.div.onmove([e.targetTouches[0].pageX,
                    e.targetTouches[0].pageY]);
            };

            var addOffsets = omg.ui.totalOffsets(addButton);
            var removeOffsets = omg.ui.totalOffsets(removeButton);

            bam.song.div.onmove = function (xy) {

                if (bam.zones[bam.zones.length - 1] != bam.song.div) {
                    bam.song.div.onmousemove = undefined;
                    return;
                }

                if (section.dragging) {

                    section.div.style.left = section.div.offsetLeft
                            + xy[0] - lastXY[0] + "px";
                    section.div.style.top = section.div.offsetTop
                            + xy[1] - lastXY[1] + "px";
                    lastXY = xy;

                    var sectionOffsets = omg.ui.totalOffsets(section.div);
                    
                    var centerX = section.div.clientWidth / 2
                            + sectionOffsets.left;
                    var centerY = section.div.clientHeight / 2
                            + sectionOffsets.top;

                    var slidLeft = bam.song.slidLeft;
                    if (centerX > addOffsets.left //+ slidLeft
                            && centerX < addOffsets.left
                            + addButton.clientWidth //+ slidLeft
                            && centerY > addOffsets.top
                            && centerY < addOffsets.top
                            + addButton.clientHeight) {
                        addButton.style.backgroundColor = "white";
                        overCopy = true;
                    } else {
                        addButton.style.backgroundColor = section.div.style.backgroundColor;
                        overCopy = false;
                    }
                    if (centerX > removeOffsets.left //+ slidLeft
                            && centerX < removeOffsets.left
                            + removeButton.clientWidth //+ slidLeft
                            && centerY > removeOffsets.top
                            && centerY < removeOffsets.top
                            + removeButton.clientHeight * 2) {
                        removeButton.style.backgroundColor = "red";
                        overRemove = true;
                    } else {
                        removeButton.style.backgroundColor = "#FFCCCC";
                        overRemove = false;
                    }
                }
            };

            lastXY = [x, y];
        };
    };

    section.div.ontouchend = function () {
        section.div.onmouseup();
    }
    section.div.onmouseup = function () {
        section.div.onup();
    }
    section.div.onup = function () {

        if (bam.zones[bam.zones.length - 1] != bam.song.div) {
            return;
        }

        if (section.dragging) {
            if (overCopy) {
                bam.song.saved = false;
                bam.copySection(section);
            }
            if (overRemove) {
                bam.song.saved = false;
                bam.song.sections.splice(section.position, 1);
                bam.song.div.removeChild(section.div);
                bam.arrangeSections();
            }

            section.doneDragging();
        }

        if (!bam.song.doClick)
            return;

        clearTimeout(downTimeout);

        //arrangeparts needs this
        bam.section = section;

        bam.player.loopSection = section.position;
        bam.songEditor.hide(section, function () {

            bam.grow(section.div);

            bam.arrangeParts(function () {

                bam.sectionEditor.show();

            });
        });
        section.div.onclick = null;
    };
}

OMusicEditor.prototype.startSongSliding = function () {
    var bam = this;

    bam.song.div.sliding = true;

    bam.setOnMove(bam.song.div, function (x_move, y_move) {
        if (!bam.song.div.sliding) {
            return;
        }

        bam.slideSong(x_move);
    });
    bam.setOnUp(bam.song.div, function () {
        bam.setOnMove(bam.song.div, undefined);
        bam.setOnUp(bam.song.div, undefined);
        bam.song.div.sliding = false;
    });

    if (bam.songEditor.addSectionButton) {
        bam.setOnMove(bam.songEditor.addSectionButton, function (x_move) {
            if (bam.song.div.sliding) {
                bam.slideSong(x_move);
            }
            return false;
        });
        bam.setOnUp(bam.songEditor.addSectionButton, function () {
            if (bam.song.div.sliding) {
                bam.setOnMove(bam.song.div, undefined);
                bam.setOnUp(bam.song.div, undefined);
                bam.song.div.sliding = false;
            }
            return false;
        });
    }

};

OMusicEditor.prototype.slideSong = function (x_move) {
    var bam = this;

    if (Math.abs(bam.song.lastX - bam.song.firstX) > 15) {
        bam.song.doClick = false;
    }

    if (!bam.song.slidLeft)
        bam.song.slidXLeft = 0;

    bam.song.slidLeft += bam.song.lastX - x_move;
    bam.song.slidLeft = Math.max(0, bam.song.slidLeft);

    bam.song.div.style.width = bam.windowWidth + bam.song.slidLeft + "px";
    bam.song.div.style.left = -1 * bam.song.slidLeft + "px";

    bam.songEditor.addSectionButton.style.left = bam.offsetLeft +
            5 + bam.song.sections.length * (10 + bam.songEditor.sectionWidth) - bam.song.slidLeft + "px";

    bam.song.lastX = x_move;

};

OMusicEditor.prototype.makePartDiv = function (part) {
    var bam = this;

    var newDiv = document.createElement("div");
    newDiv.className = "part2";
    newDiv.style.display = "block";
    newDiv.style.borderWidth = "1px";
    newDiv.style.borderRadius = bam.borderRadius + "px";

    part.div = newDiv;

    if (part) {
        bam.section.div.appendChild(newDiv);
        //bam.section.parts.push(part);
        bam.setupPartDiv(part);

    }

    return part;
};

OMusicEditor.prototype.makeSectionDiv = function (section) {
    var bam = this;

    var newDiv = document.createElement("div");
    newDiv.className = "section";
    newDiv.style.display = "block";
    bam.song.div.appendChild(newDiv);

    section.div = newDiv;

    section.div.style.borderWidth = "1px";
    section.div.style.borderRadius = bam.borderRadius + "px";

    //I think makeParts() wants this
    bam.section = section;

    var targets;

    /*bam.makeChordsView(section);
    targets = bam.setTargetsSmallParts(null, -1, section.parts.length,
            newDiv.clientWidth, newDiv.clientHeight);
    bam.reachTarget(section.chordsView, targets);*/

    var newPart;
    var newParts = [];
    var newPartDiv;
    for (var ip = 0; ip < section.parts.length; ip++) {

        newPart = bam.makePartDiv(section.parts[ip]);

        if (newPart) {
            newPartDiv = newPart.div;
            newParts.push(newPartDiv);

            targets = bam.setTargetsSmallParts(null, ip, section.parts.length,
                    newDiv.clientWidth, newDiv.clientHeight);

            bam.reachTarget(newPartDiv, targets);
        }
    }

    bam.setupSectionDiv(section);

    bam.fadeIn(newParts);
    
    return newDiv;
};

OMusicEditor.prototype.makeChordsView = function (section) {
    return;
    var bam = this;
    section.chordsView = document.createElement("div");
    section.chordsView.className = "section-chords-view";
    section.chordsView.style.top = "-100px";
    var chordsDiv = document.createElement("div");
    chordsDiv.className = "section-chords-text";
    chordsDiv.innerHTML = "I";

    section.chordsView.chordsText = chordsDiv;

    bam.setChordsText(section);
    section.chordsView.appendChild(chordsDiv);
    
    section.chordsView.onclick = function () {
        if (bam.zones[bam.zones.length - 1] === bam.section.div
                && !bam.section.chordsView.editting) {
            bam.section.chordsView.editting = true;
            bam.sectionEditor.editChords();   
        }
    };
    
    section.chordsView.style.position = "absolute";
    section.div.appendChild(section.chordsView);
    

}

OMusicEditor.prototype.setChordsText = function (section) {
    return;
    var chordsDiv = section.chordsView.chordsText;
    var chordsText = "(no chords)";
    if (section.data.chordProgression) {
        chordsText = "";
        var chords = section.data.chordProgression;
        for (var i = 0; i < chords.length; i++) {
            if (i > 0) {
                chordsText += " - ";
            }
            //chordsText += omg.ui.getChordText(chords[i], section.data.keyParams.scale);
            chordsText += omg.ui.getChordText(chords[i], section.song.data.keyParams.scale);
        }
    }
    chordsDiv.innerHTML = chordsText;
};

OMusicEditor.prototype.songZoneBeatPlayed = function (isubbeat, isection) {
    var bam = this;

    if (isubbeat === 0 && isection === 0) {
        bam.song.sections.forEach(function (section) {
            if (section.beatmarker) {
                section.beatmarker.style.width = "0px";
            }
        });
    }

    var section = bam.song.sections[isection];
    if (!section)
        return;


    if (!section.beatmarker) {
        section.beatmarker = document.createElement("div");
        section.beatmarker.className = "beat-marker";
        section.div.appendChild(section.beatmarker);
        section.beatmarker.style.left = "0px";
        section.beatmarker.style.top = "0px";
        section.beatmarker.style.height = "100%";
        section.beatmarker.style.zIndex = 1;
    }

    section.beatmarker.style.display = "block";
    if (isubbeat == 0 && isection > 0) {
        bam.song.sections[isection - 1].beatmarker.style.width = "100%";
    }
    section.beatmarker.style.width = isubbeat / 
            (bam.song.data.measures * bam.song.data.beats * bam.song.data.subbeats) * 100 + "%";
};

OMusicEditor.prototype.partZoneBeatPlayed = function (isubbeat) {
    var bam = this;
    bam.part.ui.updateBeatMarker(isubbeat);
};

OMusicEditor.prototype.sectionZoneBeatPlayed = function (isubbeat) {
    var bam = this;

    bam.section.parts.forEach(function (part) {
        part.ui.updateBeatMarker(isubbeat);
    });
};


OMusicEditor.prototype.makeTargets = function (thingsOfAType, setTarget) {
    var children = [];
    thingsOfAType.forEach(function (thing, ii) {
        thing.position = ii;

        child = {div: thing.div};

        child.originalH = child.div.clientHeight;
        child.originalW = child.div.clientWidth;
        child.originalX = child.div.offsetLeft;
        child.originalY = child.div.offsetTop;

        setTarget(child, ii);

        children.push(child);
    });

    return children;
};



OMusicEditor.prototype.setOnMove = function (element, callback) {

    if (callback) {
        element.onmousemove = function (event) {
            event.preventDefault();
            callback(event.clientX, event.clientY);
        };
        element.ontouchmove = function (event) {
            event.preventDefault();
            callback(event.targetTouches[0].pageX,
                    event.targetTouches[0].pageY);
        };
    } else {
        element.onmousemove = callback;
        element.ontouchmove = callback;
    }

};
OMusicEditor.prototype.setOnUp = function (element, callback) {

    if (callback) {
        /*element.onmouseout = function(event) {
         event.preventDefault();
         callback(-1, -1);
         };*/
        element.onmouseup = function (event) {
            event.preventDefault();
            callback(event.clientX, event.clientY);
        };
        element.ontouchend = function (event) {
            event.preventDefault();
            callback(-1, -1);
        };
    } else {
        element.onmouseup = undefined;
        element.ontouchend = undefined;
        element.onmouseout = undefined;
    }

};

OMusicEditor.prototype.showKeyChooser = function (e) {
    var bam = this;

    if (this.keyChooser) {
        this.keyChooser.parentElement.removeChild(this.keyChooser);
        this.keyChooser = undefined;
        return;
    }

    var thing = bam.zones[bam.zones.length - 1] == bam.song.div ? bam.song :
            (bam.section && bam.zones[bam.zones.length - 1] == bam.section.div) ?
            bam.section : bam.part;

    var chooserDiv = document.createElement("div");
    chooserDiv.style.position = "absolute";
    chooserDiv.style.backgroundColor = "white";
    chooserDiv.style.top = e.target.offsetTop + e.target.clientHeight +
            e.target.parentElement.offsetTop + "px";
    chooserDiv.style.left = e.target.offsetLeft + "px";
    var div = document.createElement("div");
    div.style.display = "inline-block";
    div.style.verticalAlign = "top";
    div.style.borderWidth = "1px";
    div.style.borderStyle = "solid";
    var keyDiv;
    var selectedKeyDiv;
    for (var i = 0; i < this.keys.length; i++) {
        keyDiv = document.createElement("div");
        keyDiv.innerHTML = this.keys[i];
        keyDiv.style.padding = "5px";
        keyDiv.style.paddingLeft = "10px";
        keyDiv.style.paddingRight = "10px";
        keyDiv.style.borderBottomStyle = "solid";
        keyDiv.style.borderBottomWidth = "1px";

        if ((bam.song.data.rootNote || 0) == i) {
            selectedKeyDiv = keyDiv;
            keyDiv.style.backgroundColor = "lightgreen";
        }

        keyDiv.onclick = (function (keyDiv, i) {
            return function () {
                if (selectedKeyDiv) {
                    selectedKeyDiv.style.backgroundColor = "white";
                }
                selectedKeyDiv = keyDiv;
                bam.song.data.rootNote = i;
                thing.data.rootNote = i;
                bam.song.saved = false;
                thing.saved = false;
                bam.player.rescaleSong(i)
                keyDiv.style.backgroundColor = "lightgreen";
                e.target.innerHTML = bam.getKeyCaption();
            };
        }(keyDiv, i));
        keyDiv.onmousemove = function (e) {
            e.target.style.backgroundColor = "orange";
        };
        keyDiv.onmouseout = function (e) {
            e.target.style.backgroundColor =
                    e.target == selectedKeyDiv ? "lightgreen" : "white";
        };
        div.appendChild(keyDiv);
    }
    chooserDiv.appendChild(div);

    div = document.createElement("div");
    div.style.display = "inline-block";
    div.style.verticalAlign = "top";
    div.style.borderWidth = "1px";
    div.style.borderStyle = "solid";
    var selectedScaleDiv;
    this.scales.forEach(function (scale) {
        var scaleDiv = document.createElement("div");
        scaleDiv.innerHTML = scale.name;
        scaleDiv.onclick = function () {
            if (selectedScaleDiv) {
                selectedScaleDiv.style.backgroundColor = "white";
            }
            selectedScaleDiv = scaleDiv;
            bam.song.data.ascale = scale.value;
            thing.data.ascale = scale.value;
            bam.song.saved = false;
            thing.saved = false;
            bam.player.rescaleSong(undefined, scale.value)
            scaleDiv.style.backgroundColor = "lightgreen";
            e.target.innerHTML = bam.getKeyCaption();
        };
        scaleDiv.style.padding = "35px";
        scaleDiv.style.borderBottomStyle = "solid";
        scaleDiv.style.borderBottomWidth = "1px";
        div.appendChild(scaleDiv);

        scaleDiv.onmousemove = function () {
            scaleDiv.style.backgroundColor = "orange";
        };
        scaleDiv.onmouseout = function () {
            scaleDiv.style.backgroundColor = "white";
        };
    });
    chooserDiv.appendChild(div);
    this.showPopUpWindow(chooserDiv);
    e.target.parentElement.parentElement.appendChild(chooserDiv);
};

OMusicEditor.prototype.showPopUpWindow = function (popup) {
    var backgroundDiv = document.createElement("div");
    backgroundDiv.style.position = "absolute";
    backgroundDiv.style.top = "0px";
    backgroundDiv.style.width = "100%";
    backgroundDiv.style.height = "100%";
    backgroundDiv.style.backgroundColor = "#777777";
    backgroundDiv.style.opacity = "0.5";
    document.body.appendChild(backgroundDiv);
    backgroundDiv.onclick = function () {
        document.body.removeChild(backgroundDiv);
        popup.parentElement.removeChild(popup);
    }
}

OMusicEditor.prototype.getKeyCaption = function () {
    var bam = this;
    var scaleName = "Major";
    if (bam.song.data.keyParams.scale) {
        this.scales.forEach(function (scale) {
            if (scale.value.join() == bam.song.data.keyParams.scale.join())
                scaleName = scale.name;
        });
    }
    return this.keys[(this.song.data.keyParams.rootNote || 0)] + " " + scaleName;
};

OMusicEditor.prototype.refreshKeyTempoChordsButtons = function () {
    if (this.keyButton)
        this.keyButton.innerHTML = this.getKeyCaption();

    if (this.tempoButton)
        this.tempoButton.innerHTML = this.getBPM() + "bpm";

    if (this.chordsButton)
        this.chordsButton.innerHTML = this.getChordsCaption();


};


OMusicEditor.prototype.showTempoChooser = function (e) {
    var bam = this;

    var thing = bam.zones[bam.zones.length - 1] == bam.song.div ? bam.song :
            (bam.section && bam.zones[bam.zones.length - 1] == bam.section.div) ?
            bam.section : bam.part;

    var chooserDiv = document.createElement("div");
    chooserDiv.style.position = "absolute";
    chooserDiv.style.backgroundColor = "white";
    chooserDiv.style.top = e.target.offsetTop + e.target.clientHeight +
            e.target.parentElement.offsetTop + "px";
    chooserDiv.style.left = e.target.offsetLeft + "px";
    chooserDiv.style.borderWidth = "1px";
    chooserDiv.style.borderStyle = "solid";

    var div = document.createElement("input");
    div.type = "range";
    div.min = 20;
    div.max = 220;
    div.step = 1;
    div.value = Math.round(1 / bam.song.data.subbeatMillis * 60000 / 4);
    
    div.onmousemove = function () {
        e.target.innerHTML = div.value + "bpm";
        bam.song.data.subbeatMillis = 
               Math.round(1000 / (div.value / 60 * (bam.song.data.subbeats || 4)));
        bam.song.saved = false;
        if (bam.player.playing) {
            bam.player.setSubbeatMillis(bam.song.data.subbeatMillis);
        }
        if (thing.data) {
            thing.data.subbeatMillis = bam.song.data.subbeatMillis;
            //if (thing == bam.part)
            //    bam.section.data.subbeatMillis = thing.data.subbeatMillis;
            thing.saved = false;
        }
    };

    chooserDiv.appendChild(div);
    this.showPopUpWindow(chooserDiv);
    e.target.parentElement.parentElement.appendChild(chooserDiv);
};

OMusicEditor.prototype.getBPM = function () {
    return Math.round(60000 / ((this.song.data.beatParams.subbeatMillis || 125) *
            (this.song.data.beatParams.subbeats || 4)));
};

OMusicEditor.prototype.getSoundSets = function (type, callback) {
    // we want to get the productions servers soundsets
    var bam = this;
    var dev = this.omgservice.dev;
    //var url = dev ? "soundsets.json" : "data/?type=SOUNDSET";
    var url = "/data/?type=SOUNDSET";

    this.omgservice.getHTTP(url, function (soundsets) {
        bam.soundsets = soundsets;
        var url;
        soundsets.forEach(function (soundset) {
            //url = (bam.omgservice.dev ? "http://openmusic.gallery/" : "") +
            url = "http://openmusic.gallery/" +
                    "data/" + soundset.id;
            bam.soundsetsURLMap[url] = soundset;
            soundset.url = url;
        });
        if (typeof callback === "function") {
            callback();
        }
    });
};

OMusicEditor.prototype.setupSelectInstrument = function (part) {
    var bam = this;
    part.controls.selectInstrument.innerHTML = bam.getSelectInstrumentOptions(part.data);
    part.controls.selectInstrument.onchange = function () {
        var soundsetURL = part.controls.selectInstrument.value;

        if (soundsetURL == "DEFAULT") {
            for (var ii = 0; ii < part.data.notes.length; ii++) {
                if (part.data.notes[ii].hasOwnProperty("sound")) {
                    delete part.data.notes[ii].sound;
                }
            }
            delete part.sound;
            return;
        }

        var soundset = bam.soundsetsURLMap[soundsetURL];
        if (!soundset) {
            //todo get the soundset if we can't find it
        }
        
        part.data.soundsetURL = soundsetURL;
        part.data.soundsetName = part.controls.selectInstrument.options
                    [part.controls.selectInstrument.selectedIndex].text;
        
        if (part.data.partType === "DRUMBEAT") {
            bam.player.setupDrumPartWithSoundSet(soundset, part, true);
            part.canvas.update();
        } else {
            bam.player.setupPartWithSoundSet(soundset, part, true);
        }
    };
  
};

OMusicEditor.prototype.save = function (callback) {
    var bam = this;
    
    var zone = bam.zones[bam.zones.length - 1];
    var element;
    if (zone) {
        if (zone === bam.song.div) {
            element = bam.song;
        }
        if (zone === bam.section.div) {
            element = bam.section;
        }
        if (zone === bam.part.div) {
            element = bam.part;
        }
        if (element) {
            if (!element.saved) {
                element.data.previousId = element.data.id;
                element.data.id = undefined;
                element.saving = true;
                var saveData;
                if (typeof element.getData === "function") {
                    saveData = element.getData();
                }
                else {
                    saveData = element.data;
                }
                bam.omgservice.post(saveData, function (response) {
                    if (response && response.id) {
                        element.saved = true;
                        if (callback) {
                            callback(response.id);
                        }
                    }
                    element.saving = false;
                });
            }
            else {
                if (callback) callback();
            }
        }
    }
};

function testData() {
//    return {"tags":"jam power","type":"SECTION","beats":4,"parts":[{"type":"PART","notes":[{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5},{"note":0,"rest":false,"beats":0.5}],"scale":"0,3,5,6,7,10","ascale":[0,3,5,6,7,10],"octave":3,"volume":0.97115535,"rootNote":0,"surfaceURL":"PRESET_VERTICAL","soundsetURL":"PRESET_BASS","soundsetName":"Electric Bass"},{"type":"PART","notes":[],"scale":"0,3,5,6,7,10","ascale":[0,3,5,6,7,10],"octave":3,"tracks":[{"data":[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],"name":"kick","sound":"PRESET_ROCK_KICK"},{"data":[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],"name":"snare","sound":"PRESET_ROCK_SNARE"},{"data":[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],"name":"hi-hat","sound":"PRESET_ROCK_HIHAT_MED"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],"name":"open hi-hat","sound":"PRESET_ROCK_HIHAT_OPEN"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"crash","sound":"PRESET_ROCK_CRASH"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"h tom","sound":"PRESET_ROCK_TOM_MH"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"m tom","sound":"PRESET_ROCK_TOM_ML"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"l tom","sound":"PRESET_ROCK_TOM_L"}],"volume":0.75,"rootNote":0,"surfaceURL":"PRESET_SEQUENCER","soundsetURL":"PRESET_ROCKKIT","soundsetName":"Rock Drum Kit"},{"type":"PART","notes":[],"scale":"0,3,5,6,7,10","ascale":[0,3,5,6,7,10],"octave":3,"tracks":[{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"bongo l","sound":"PRESET_bongol"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"bongo l","sound":"PRESET_bongoh"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"click l","sound":"PRESET_clickl"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"click h","sound":"PRESET_clickh"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"shhk","sound":"PRESET_shhk"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"scrape","sound":"PRESET_scrape"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"whoop","sound":"PRESET_whoop"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"chimes","sound":"PRESET_chimes"}],"volume":0.75,"rootNote":0,"surfaceURL":"PRESET_SEQUENCER","soundsetURL":"PRESET_PERCUSSION_SAMPLER","soundsetName":"Percussion Sampler"},{"type":"PART","notes":[{"note":0,"rest":false,"beats":1},{"note":0,"rest":false,"beats":1},{"note":0,"rest":false,"beats":1},{"note":0,"rest":false,"beats":1},{"note":0,"rest":false,"beats":1},{"note":0,"rest":false,"beats":1},{"note":1,"rest":false,"beats":0.5},{"note":1,"rest":false,"beats":0.5},{"note":1,"rest":false,"beats":0.5},{"note":1,"rest":false,"beats":0.25},{"note":1,"rest":false,"beats":0.25}],"scale":"0,3,5,6,7,10","ascale":[0,3,5,6,7,10],"octave":3,"volume":0.5045179,"rootNote":0,"surfaceURL":"PRESET_VERTICAL","soundsetURL":"http://openmusic.gallery/data/401","soundsetName":"Guitar Power Chords"},{"type":"PART","notes":[{"note":2,"rest":false,"beats":0.5},{"note":2,"rest":false,"beats":0.5},{"note":2,"rest":false,"beats":0.5},{"note":2,"rest":false,"beats":0.5},{"note":2,"rest":false,"beats":0.5},{"note":2,"rest":false,"beats":0.5},{"note":2,"rest":false,"beats":0.5},{"note":2,"rest":false,"beats":0.5},{"note":2,"rest":false,"beats":0.5},{"note":2,"rest":false,"beats":0.25},{"note":2,"rest":false,"beats":0.25},{"note":2,"rest":false,"beats":0.25},{"note":2,"rest":false,"beats":0.25},{"note":2,"rest":false,"beats":0.25},{"note":2,"rest":false,"beats":0.25},{"note":2,"rest":false,"beats":0.25},{"note":2,"rest":false,"beats":0.25},{"note":2,"rest":false,"beats":0.25},{"note":2,"rest":false,"beats":0.25},{"note":2,"rest":false,"beats":0.25},{"note":2,"rest":false,"beats":0.25},{"note":2,"rest":false,"beats":0.25}],"scale":"0,3,5,6,7,10","ascale":[0,3,5,6,7,10],"octave":3,"tracks":[{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"A","sound":"http://mikehelland.com/omg/joe/THICKAS/A.mp3"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"B","sound":"http://mikehelland.com/omg/joe/THICKAS/B.mp3"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"C","sound":"http://mikehelland.com/omg/joe/THICKAS/C.mp3"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"D","sound":"http://mikehelland.com/omg/joe/THICKAS/D.mp3"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"E","sound":"http://mikehelland.com/omg/joe/THICKAS/E.mp3"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"F","sound":"http://mikehelland.com/omg/joe/THICKAS/F.mp3"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"G","sound":"http://mikehelland.com/omg/joe/THICKAS/G.mp3"},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"RIBBIT","sound":"http://mikehelland.com/omg/joe/THICKAS/RIBBIT.mp3"}],"volume":0.91942555,"rootNote":0,"surfaceURL":"PRESET_VERTICAL","soundsetURL":"http://openmusic.gallery/data/62","soundsetName":"THICK"}],"scale":"0,3,5,6,7,10","ascale":[0,3,5,6,7,10],"shuffle":0,"measures":2,"rootNote":0,"subbeats":4,"created_at":1513287123361,"last_modified":1513287123361,"subbeatMillis":250,"chordProgression":[0,1],"id":405};
    return {"tags":"slow easy","type":"SECTION","parts":[{"id":"3c068e87-5954-495b-850a-35feb209b8d2","type":"PART","notes":[{"note":10,"rest":false,"beats":0.5},{"note":7,"rest":false,"beats":0.5},{"rest":true,"beats":3.5},{"note":14,"rest":false,"beats":0.5},{"note":14,"rest":false,"beats":0.5},{"note":14,"rest":false,"beats":0.5},{"note":14,"rest":false,"beats":0.5},{"rest":true,"beats":0.5},{"note":11,"rest":false,"beats":0.5},{"note":11,"rest":false,"beats":0.5},{"rest":true,"beats":0.25}],"octave":3,"surface":{"url":"PRESET_VERTICAL","name":"","skipTop":0,"skipBottom":0},"soundSet":{"url":"PRESET_OSC_SINE_SOFT_DELAY","name":"Osc Soft Sine Delay","soundFont":false},"audioParams":{"pan":-0.1550399,"mute":false,"speed":1,"volume":0.67042214}},{"id":"9260285c-56b8-4061-adf3-4b33877f2b6b","type":"PART","notes":[{"note":-6,"rest":false,"beats":1},{"note":-6,"rest":false,"beats":1}],"octave":3,"surface":{"url":"PRESET_VERTICAL","name":"","skipTop":0,"skipBottom":0},"soundSet":{"url":"http://openmusic.gallery/data/413","name":"Slap Bass","soundFont":false},"audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.41803226}},{"id":"555f9eee-f8b5-4f3a-bf79-3c6da491b658","type":"PART","tracks":[{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"kick","sound":"PRESET_HH_KICK","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"clap","sound":"PRESET_HH_CLAP","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"closed hi-hat","sound":"PRESET_ROCK_HIHAT_CLOSED","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],"name":"open hi-hat","sound":"PRESET_HH_HIHAT","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"tambourine","sound":"PRESET_HH_TAMB","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"h tom","sound":"PRESET_HH_TOM_MH","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"m tom","sound":"PRESET_HH_TOM_ML","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"l tom","sound":"PRESET_HH_TOM_L","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}}],"surface":{"url":"PRESET_SEQUENCER","name":"","skipTop":0,"skipBottom":0},"soundSet":{"url":"PRESET_HIPKIT","name":"Hip Hop Drum Kit","soundFont":false},"audioParams":{"pan":0.3440994,"mute":false,"speed":1,"volume":0.8371134}},{"id":"484e3268-b8e1-46c9-8f6a-7496c1f079cd","type":"PART","notes":[{"note":-7,"rest":false,"beats":4.5}],"octave":3,"surface":{"url":"PRESET_VERTICAL","name":"","skipTop":0,"skipBottom":0},"soundSet":{"url":"http://openmusic.gallery/data/744","name":"SUBBASS","soundFont":false},"audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.63962644}}],"madeWith":"","created_at":1528686709198,"omgVersion":0.9,"keyParams":{"scale":[0,2,3,5,7,8,10],"rootNote":3},"last_modified":1528686709198,"beatParams":{"beats":4,"shuffle":0,"measures":2,"subbeats":4,"subbeatMillis":142},"chordProgression":[0,0,-1],"id":1150};
//    return {"tags":"testosc","type":"SECTION","parts":[{"id":"db37262b-08d0-49ae-8d15-57e304c94457","type":"PART","notes":[{"note":13,"rest":false,"beats":0.75},{"note":16,"rest":false,"beats":0.25},{"note":18,"rest":false,"beats":0.25},{"note":20,"rest":false,"beats":0.25},{"note":22,"rest":false,"beats":0.5},{"note":23,"rest":false,"beats":0.5},{"rest":true,"beats":0.5},{"note":31,"rest":false,"beats":0.5},{"rest":true,"beats":1},{"note":30,"rest":false,"beats":0.5},{"note":29,"rest":false,"beats":0.5},{"rest":true,"beats":1},{"note":30,"rest":false,"beats":0.75}],"octave":3,"surface":{"url":"PRESET_VERTICAL","name":"","skipTop":0,"skipBottom":0},"soundSet":{"url":"PRESET_OSC_SINE_SOFT_DELAY","name":"Osc Soft Sine Delay","soundFont":false},"audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"id":"a0624867-fa0b-41a9-bc64-0ffb0ef01281","type":"PART","notes":[],"octave":3,"surface":{"url":"PRESET_VERTICAL","name":"","skipTop":0,"skipBottom":0},"soundSet":{"url":"http://openmusic.gallery/data/413","name":"Slap Bass","soundFont":false},"audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"id":"057b83ce-4b36-4490-b026-31e4cfe9a546","type":"PART","tracks":[{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"kick","sound":"PRESET_HH_KICK","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"clap","sound":"PRESET_HH_CLAP","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"closed hi-hat","sound":"PRESET_ROCK_HIHAT_CLOSED","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"open hi-hat","sound":"PRESET_HH_HIHAT","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"tambourine","sound":"PRESET_HH_TAMB","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"h tom","sound":"PRESET_HH_TOM_MH","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"m tom","sound":"PRESET_HH_TOM_ML","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}},{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"name":"l tom","sound":"PRESET_HH_TOM_L","audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}}],"surface":{"url":"PRESET_SEQUENCER","name":"","skipTop":0,"skipBottom":0},"soundSet":{"url":"PRESET_HIPKIT","name":"Hip Hop Drum Kit","soundFont":false},"audioParams":{"pan":0,"mute":false,"speed":1,"volume":0.75}}],"madeWith":"","created_at":1528700746966,"omgVersion":0.9,"keyParams":{"scale":[0,3,5,6,7,10],"rootNote":0},"last_modified":1528700746966,"beatParams":{"beats":4,"shuffle":0,"measures":2,"subbeats":4,"subbeatMillis":125},"chordProgression":[0],"id":1151};
}


function OMGDragAndDropHelper() {

    // caller hooks
    this.ondrag = function (div, x, y) {
        return true; // return false to manually handle dragging
    };
    this.onstartnewlevel = function () {};
    this.onshortclick = function (div) {};

    this.longClickTimeMS = 250;
    this.children = [];
}

OMGDragAndDropHelper.prototype.disable = function () {
    this.children.forEach(function (div) {
        div.onmousedown = undefined;
        div.ontouchstart = undefined;
    });
};

OMGDragAndDropHelper.prototype.setupChildDiv = function (div) {

    this.children.push(div);
    var ddh = this;
    div.omgdd = {dragLevel: 0};

    div.onmousedown = function (event) {
        event.preventDefault();
        ddh.ondown(div, event.clientX, event.clientY);
    };
    div.ontouchstart = function (event) {
        event.preventDefault();
        ddh.ondown(div, event.targetTouches[0].pageX, event.targetTouches[0].pageY);
    };

    div.omgdd.parentOffsets = omg.ui.totalOffsets(div.parentElement);

    div.omgdd.onclick = div.onclick;
    div.onclick = undefined;
};

OMGDragAndDropHelper.prototype.ondown = function (div, x, y) {

    var ddh = this;
    var divdd = div.omgdd;

    divdd.dragLevel = 1; // 0 for off, 1 for short click then drag, 2 for long click and drag

    divdd.firstX = x;
    divdd.lastX = x;
    divdd.lastY = y;

    divdd.doClick = true;

    ddh.onstartnewlevel(div);

    // sense for a long click, and then move the drag level up and cancel the click
    divdd.downTimeout = setTimeout(function () {

        divdd.doClick = false;

        if (Math.abs(divdd.lastX - divdd.firstX) < 15) {

            divdd.dragLevel = 2;
            ddh.onstartnewlevel(div);
        }

    }, ddh.longClickTimeMS);


    div.parentElement.onmousemove = function (event) {
        ddh.onmove(div, event.clientX, event.clientY);
    };
    div.parentElement.ontouchmove = function (e) {
        ddh.onmove(div, e.targetTouches[0].pageX, e.targetTouches[0].pageY);
    };
    div.parentElement.ontouchend = function () {
        ddh.onmouseup(div);
    };
    div.parentElement.onmouseup = function () {
        ddh.onup(div);
    };

};


OMGDragAndDropHelper.prototype.onmove = function (div, x, y) {

    var px = (x - div.omgdd.parentOffsets.left) / div.parentElement.clientWidth;
    var py = (y - div.omgdd.parentOffsets.top) / div.parentElement.clientHeight;
    if (this.ondrag(div, x, y, px, py)) {
        div.omgdd.resetZ = true;
        div.style.zIndex = "1";
        div.style.left = div.offsetLeft + x - div.omgdd.lastX + "px";
        div.style.top = div.offsetTop + y - div.omgdd.lastY + "px";
    }

    div.omgdd.lastX = x;
    div.omgdd.lastY = y;
};

OMGDragAndDropHelper.prototype.onup = function (div) {

    div.omgdd.dragLevel = 0;

    if (div.omgdd.resetZ) {
        div.style.zIndex = "0";
    }
    div.parentElement.onmousemove = undefined;
    div.parentElement.ontouchmove = undefined;
    div.parentElement.ontouchend = undefined;
    div.parentElement.onmouseup = undefined;

    if (!div.omgdd.doClick)
        return;

    clearTimeout(div.omgdd.downTimeout);

    this.onshortclick(div);
    //div.omgdd.onclick();
};