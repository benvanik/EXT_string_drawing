Very early project to write a low-level text run drawing extension to WebGL.
See the IDL for a definition/documentation about the API, then simply include
the js file to enable the extension.

    // Grab the extension for use
    var ext = gl.getExtension("EXT_string_drawing");

    // Create a character map with a specific font and add the basic ASCII
    // character set to it
    var map = ext.createCharacterMap({
        fontFamily: "Tahoma",
        fontSize: "10px"
    });
    ext.characterMapAppendSet(map, ext.CHARACTER_SET_ASCII);

    // Create a string object and set some properties on it
    var s0 = ext.createString(ext.DRAWN_STRING);
    ext.stringData(s0, map, "hello world!", gl.STATIC_DRAW);
    ext.stringColor(s0, 1.0, 0.0, 0.0, 1.0);
    ext.stringShadow(s0, 3.0, 3.0, 0.0, 0.0, 0.0);

    // Draw the string in the scene
    ...
    ext.drawString(s0, 100.0, 10.0, 1.0); // x,y,z,scale on the screen
    ext.drawString(s0, matrix); // matrix
    ...


    // Create a string object and program
    var s1 = ext.createString(ext.PAINTED_STRING);
    ext.stringData(s1, map, "hello world!", gl.STATIC_DRAW);
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, ext.getStringFragmentShader());
    gl.linkProgram(program);

    // Draw the string painted on existing geometry
    ...
    ext.useString(s1, program);
    // draw geometry
    ...

For optimal performance batch map/string updates separately from draws. No real work
is performed until a draw/use. If you want to force the work to happen at a specific
time (ideally as early in the frame as possible after all modifications have been done)
call flushStrings().
When drawing strings try to batch based on map/string - this will reduce state thrashing.

    // Start of frame:
    ext.characterMapAppendCharacters(map0, ...);
    ext.stringData(string0, map0, ...);
    ext.stringData(string1, map0, ...);
    ext.characterMapAppendCharacters(map1, ...);
    ext.stringData(string2, map1, ...);
    ext.stringData(string3, map1, ...);
    ext.flushStrings(); // optional, but recommended
    ...
    // Do all draws sorted by map/string
    ext.drawString(string0, ...); // from map0
    ext.drawString(string1, ...); // from map0
    ext.drawString(string2, ...); // from map1
    ext.drawString(string3, ...); // from map1
    