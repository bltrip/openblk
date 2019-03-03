if (typeof omg !== "object") 
    omg = {};
    
omg.midi = {
    onSuccess: function (midiAccess) {
        omg.midi.api = midiAccess; 
        midiAccess.inputs.forEach( function(entry) {entry.onmidimessage = omg.midi.onMessage;});
    },
    onFailure: function (msg) {
        console.log( "Failed to get MIDI access - " + msg );
    },
    listInputsAndOutputs: function (midiAccess) {
        for (var input in midiAccess.inputs) {
            console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
            "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
            "' version:'" + input.version + "'" );
        }

        for (var output in midiAccess.outputs) {
            console.log( "Output port [type:'" + output.type + "'] id:'" + output.id +
            "' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
            "' version:'" + output.version + "'" );
        }
    },
    onMessage: function (event) {
  
        // Mask off the lower nibble (MIDI channel, which we don't care about)
        switch (event.data[0] & 0xf0) {
            case 0x90:
                if (event.data[2]!=0) {  // if velocity != 0, this is a note-on message
                    omg.midi.onnoteon(event.data[1]);
                    return;
                }
                // if velocity == 0, fall thru: it's a note-off.  MIDI's weird, y'all.
            case 0x80:
                omg.midi.onnoteoff(event.data[1]);
                return;
            case 0xb0:
                switch (event.data[1]) {
                    case 24:
                        omg.midi.onplay();
                        return;
                    case 23:
                        omg.midi.onstop();
                        return;
                    default:
                        omg.midi.onmessage(event.data[1], event.data[2]);
                }
                return;
        }
    },
    onnoteon: function (note) {console.log(note)},
    onnoteoff: function (note) {console.log(note)},
    onmessage: function (control, value) {console.log(control, value)},
    onplay: function () {},
    onstop: function () {}
};


if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(omg.midi.onSuccess, omg.midi.onFailure );
}
