(function () {

    var StringBuffer = function StringBuffer(gl, charCapacity) {
        this.gl = gl;

        this.arrayBuffer_ = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.arrayBuffer_);
        gl.bufferData(gl.ARRAY_BUFFER, charCapacity * 4 * 4 * 2, gl.DYNAMIC_DRAW);

        // TODO: a real bitmap tracking usage/etc
        this.nextOffset_ = 0;
    };
    StringBuffer.prototype.dispose = function dispose() {
        var gl = this.gl;
        gl.deleteBuffer(this.arrayBuffer_);
        this.buffer_ = null;
    };
    StringBuffer.prototype.allocate = function allocate(str) {
        var gl = this.gl;
        var map = str.map_;
        var chars = str.characters_;

        var scratch = new Int16Array(chars.length * 4 * 4);

        var x = 0;
        var y = 0;
        var h = map.charHeight_;

        var sw = map.slotSize_ / map.maxSize_ * 32767;

        for (var n = 0, v = 0; n < chars.length; n++) {
            var c = chars[n];
            var char = map.chars_[c];
            var w = char.width;

            // TODO: cache on char
            var slot = char.slot;
            var sx = slot % map.slotsPerSide_;
            var sy = Math.floor(slot / map.slotsPerSide_);
            var s = sx * sw;
            var t = sy * sw;

            // TODO: grow pos by spread

            // 0---1
            // | / |
            // 2---3

            // 0 (TL)
            scratch[v++] = x;
            scratch[v++] = y;
            scratch[v++] = s;
            scratch[v++] = t;

            // 1 (TR)
            scratch[v++] = x + w;
            scratch[v++] = y;
            scratch[v++] = s + sw;
            scratch[v++] = t;

            // 2 (BL)
            scratch[v++] = x;
            scratch[v++] = y - h;
            scratch[v++] = s;
            scratch[v++] = t + sw;

            // 3 (BR)
            scratch[v++] = x + w;
            scratch[v++] = y - h;
            scratch[v++] = s + sw;
            scratch[v++] = t + sw;

            x += w;
            // TODO: spacing
            x += 1;
        }

        var offset = str.bufferOffset_ = this.nextOffset_;
        this.nextOffset_ += scratch.byteLength;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.arrayBuffer_);
        gl.bufferSubData(gl.ARRAY_BUFFER, offset, scratch);
    };

    // TODO: optimize
    var DistanceFieldGenerator = function DistanceFieldGenerator(font) {
        var fontString = "";
        fontString += font.fontStyle + " ";
        fontString += font.fontVariant + " ";
        fontString += font.fontWeight + " ";
        fontString += font.fontSize + " ";
        fontString += font.fontFamily + " ";
        this.fontString_ = fontString;
        
        var canvas = this.canvas = document.createElement("canvas");
        var frag = document.createDocumentFragment();
        frag.appendChild(canvas);

        var ctx = this.ctx = canvas.getContext("2d");
        ctx.font = this.fontString_;
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgb(0, 0, 0)";

        // Bespin does this... for some reason ^_^
        this.ascent = ctx.measureText("m").width;

        // Resize to what we think will be enough
        this.spread = 15; // TODO: tweak
        canvas.width = canvas.height = this.ascent + this.spread * 2;
        this.size = canvas.width;

        this.grid1 = new Int32Array(canvas.width * canvas.height * 2);
        this.grid2 = new Int32Array(canvas.width * canvas.height * 2);
    };
    DistanceFieldGenerator.prototype.generate = function generate(char) {
        var ctx = this.ctx;

        ctx.font = this.fontString_;
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgb(0, 0, 0)";

        // Measure
        var width = ctx.measureText(char.value).width;
        char.width = width;

        // Draw the character in the canvas
        var x = this.canvas.width / 2 - width / 2;
        var y = this.canvas.height / 2 - this.ascent / 2;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillText(char.value, x, y);

        // TODO: faster!!!
        this.generateSlow_(char);
    };
    DistanceFieldGenerator.prototype.generateSlowCompare_ = function generateSlowCompare_(w, h, grid, x, y, ox, oy, t) {
        var px = 9999;
        var py = 9999;
        if ((x > 0) && (x < w) && (y > 0) && (y < h)) {
            var i = (y + oy) * w * 2 + (x + ox) * 2;
            px = grid[i] + ox;
            py = grid[i + 1] + oy;
        }
        var td = t.x * t.x + t.y * t.y;
        var pd = px * px + py * py;
        if (pd < td) {
            t.x = px;
            t.y = py;
        }
    };
    DistanceFieldGenerator.prototype.generateSlowGrid_ = function generateSlowGrid_(w, h, grid) {
        var i;
        var t = { x: 0, y: 0 };
        for (var y = 0; y < h; y++) {
            i = y * w * 2;
            for (var x = 0; x < w; x++, i += 2) {
                t.x = grid[i];
                t.y = grid[i + 1];
                this.generateSlowCompare_(w, h, grid, x, y, -1, 0, t);
                this.generateSlowCompare_(w, h, grid, x, y, 0, -1, t);
                this.generateSlowCompare_(w, h, grid, x, y, -1, -1, t);
                this.generateSlowCompare_(w, h, grid, x, y, 1, -1, t);
                grid[i] = t.x;
                grid[i + 1] = t.y;
            }
            i = y * w * 2 + w * 2 - 2;
            for (var x = w - 1; x >= 0; x--, i -= 2) {
                t.x = grid[i];
                t.y = grid[i + 1];
                this.generateSlowCompare_(w, h, grid, x, y, 1, 0, t);
                grid[i] = t.x;
                grid[i + 1] = t.y;
            }
        }
        for (var y = h - 1; y >= 0; y--) {
            i = y * w * 2 + w * 2 - 2;
            for (var x = w - 1; x >= 0; x--, i -= 2) {
                t.x = grid[i];
                t.y = grid[i + 1];
                this.generateSlowCompare_(w, h, grid, x, y, 1, 0, t);
                this.generateSlowCompare_(w, h, grid, x, y, 0, 1, t);
                this.generateSlowCompare_(w, h, grid, x, y, -1, 1, t);
                this.generateSlowCompare_(w, h, grid, x, y, 1, 1, t);
                grid[i] = t.x;
                grid[i + 1] = t.y;
            }
            i = y * w * 2;
            for (var x = 0; x < w; x++, i += 2) {
                t.x = grid[i];
                t.y = grid[i + 1];
                this.generateSlowCompare_(w, h, grid, x, y, -1, 0, t);
                grid[i] = t.x;
                grid[i + 1] = t.y;
            }
        }
    };
    DistanceFieldGenerator.prototype.generateSlow_ = function generateSlow_(char) {
        var grid1 = this.grid1;
        var grid2 = this.grid2;
        var w = this.canvas.width;
        var h = this.canvas.height;
        var pixels = this.ctx.getImageData(0, 0, w, h);
        var data = pixels.data;

        var si = 0;
        var di = 0;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++, si += 4, di += 2) {
                var a = data[si + 3];
                if (a >= 128) {
                    // inside
                    grid1[di] = 0;
                    grid1[di + 1] = 0;
                    grid2[di] = 9999;
                    grid2[di + 1] = 9999;
                } else {
                    // outside
                    grid1[di] = 9999;
                    grid1[di + 1] = 9999;
                    grid2[di] = 0;
                    grid2[di + 1] = 0;
                }
            }
        }

        this.generateSlowGrid_(w, h, grid1);
        this.generateSlowGrid_(w, h, grid2);

        var minDist = -this.spread;
        var maxDist = this.spread;
        var output = new Uint8Array(w * h);
        si = 0;
        di = 0;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++, si += 2, di += 1) {
                var x1 = grid1[si];
                var y1 = grid1[si + 1];
                var dist1 = Math.floor(Math.sqrt(x1 * x1 + y1 * y1));
                var x2 = grid2[si];
                var y2 = grid2[si + 1];
                var dist2 = Math.floor(Math.sqrt(x2 * x2 + y2 * y2));
                var dist = dist1 - dist2;
                if (dist < 0) {
                    dist = -128 * (dist - minDist) / minDist;
                } else {
                    dist = 128 + 128 * dist / maxDist;
                }
                output[di] = Math.max(Math.min(dist, 255), 0);
            }
        }

        char.data = output;
    };

    var ExtChar = function ExtChar(c) {
        this.value = c;
        this.code = c.charCodeAt(0);
        this.slot = -1;
        this.width = 0.0;
        this.data = null;
    };

    var ExtCharacterMap = function ExtCharacterMap(gl, font) {
        this.font_ = {
            fontFamily: font.fontFamily || "san-serif",
            fontStyle: font.fontStyle || "normal",
            fontSize: font.fontSize || "12px",
            fontWeight: font.fontWeight || "normal",
            fontVariant: font.fontVariant || "normal"
        };
        // TODO: clamp/massage values/convert to standards

        this.generator_ = new DistanceFieldGenerator(this.font_);
        this.charHeight_ = this.generator_.ascent;
        this.slotSize_ = this.generator_.size;

        this.deleted_ = false;
        this.refCount_ = 1; // self

        this.charsDirty_ = false;
        this.pendingChars_ = [];

        // TODO: pick a better size based on font size/etc
        var maxSize = Math.min(1024, gl.getParameter(gl.MAX_TEXTURE_SIZE));

        this.maxSize_ = maxSize;
        this.slotsPerSide_ = Math.floor((maxSize / this.slotSize_));
        this.freeSlots_ = this.slotsPerSide_ * this.slotsPerSide_;
        this.nextSlot_ = 0;
        this.chars_ = {};

        this.texture = null
    };

    var ExtString = function ExtString(type) {
        this.type_ = type;

        this.deleted_ = false;
        this.refCount_ = 1; // self

        this.dataDirty_ = false;
        this.attribsDirty_ = false; // only gets set for PAINTED_STRING

        this.map_ = null;
        this.usage_ = 0;
        this.characters_ = "";
        this.width_ = 0.0;
        this.height_ = 0.0;

        // [COLOR_R,       COLOR_G,       COLOR_B,       COLOR_A,      
        //  OUTLINE_R,     OUTLINE_G,     OUTLINE_B,     OUTLINE_WIDTH,
        //  SHADOW_R,      SHADOW_G,      SHADOW_B,      SHADOW_WIDTH, 
        //  SHADOW_X,      SHADOW_Y,      x,             x            ]
        this.attribData_ = new Float32Array(16);

        // Used if drawn:
        this.buffer_ = null; // StringBuffer
        this.bufferOffset_ = 0; // vertex offset

        // Used if painted:
    };

    var EXT_string_drawing = function EXT_string_drawing(gl) {
        this.gl = gl;

        this.errorMap_ = {};

        this.dirtyCharacterMaps_ = [];
        this.dirtyStrings_ = [];

        this.currentString_ = null;

        // TODO: pick better values
        this.caps = {
            stringLength: 128,
            outlineWidth: 10.0,
            shadowWidth: 10.0,
            shadowOffset: 10.0
        };

        if (!this.setupResources_()) {
            throw "Failed to setup extension resources - broken!";
        }
    };

    EXT_string_drawing.prototype.MAX_STRING_LENGTH = 0x119950;
    EXT_string_drawing.prototype.MAX_STRING_OUTLINE_WIDTH = 0x119951;
    EXT_string_drawing.prototype.MAX_STRING_SHADOW_WIDTH = 0x119952;
    EXT_string_drawing.prototype.MAX_STRING_SHADOW_OFFSET = 0x119953;

    EXT_string_drawing.prototype.CHARACTER_MAP_FONT_ATTRIBUTES = 0x119900;

    EXT_string_drawing.prototype.CHARACTER_SET_ASCII = 0x119910;

    EXT_string_drawing.prototype.PAINTED_STRING = 0x119920;
    EXT_string_drawing.prototype.DRAWN_STRING = 0x119921;

    EXT_string_drawing.prototype.STRING_TYPE = 0x119931;
    EXT_string_drawing.prototype.STRING_USAGE = 0x119931;
    EXT_string_drawing.prototype.STRING_VALUE = 0x119931;
    EXT_string_drawing.prototype.STRING_WIDTH = 0x119932;
    EXT_string_drawing.prototype.STRING_HEIGHT = 0x119933;
    EXT_string_drawing.prototype.STRING_COLOR = 0x119934;
    EXT_string_drawing.prototype.STRING_OUTLINE_WIDTH = 0x119935;
    EXT_string_drawing.prototype.STRING_OUTLINE_COLOR = 0x119936;
    EXT_string_drawing.prototype.STRING_SHADOW_WIDTH = 0x119937;
    EXT_string_drawing.prototype.STRING_SHADOW_OFFSET = 0x119938;
    EXT_string_drawing.prototype.STRING_SHADOW_COLOR = 0x119939;



    EXT_string_drawing.prototype.setupResources_ = function setupResources_() {
        var gl = this.gl;

        // Enable standard derivatives
        if (!gl.getExtension("OES_standard_derivatives")) {
            console.log("require OES_standard_derivatives");
            return false;
        }

        var oldElementArrayBuffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
        var oldArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);

        // Shared fragment source (for linking in user programs)
        this.fragmentSource_ = "" +
            "vec4 sampleChar(sampler2D charMap, const vec2 uv, const mat4 data) {\n" +
            "    float distance = 1.0 - texture2D(charMap, uv).a;\n" +
            "    float smoothWidth = fwidth(distance);\n" +
            "    float alpha = smoothstep(0.5 - smoothWidth, 0.5 + smoothWidth, distance);\n" +
            "    return data[0].rgba * alpha;\n" +
            "}\n";

        var vertexSource = "" +
            "uniform mat4 u_transform;\n" +
            "attribute vec4 a_coords;   // [x, y, s, t]\n" +
            "varying vec2 v_coords;     // [s, t]\n" +
            "void main() {\n" +
            "    vec4 pos = vec4(a_coords.x, a_coords.y, 0.0, 1.0);\n" +
            "    gl_Position = u_transform * pos;\n" +
            "    v_coords.st = a_coords.zw / vec2(32767.0, 32767.0);\n" +
            "}\n";

        var fragmentSource = "" +
            "#extension GL_OES_standard_derivatives : enable\n" +
            "precision highp float;\n" +
            "uniform sampler2D u_charMap;\n" +
            "uniform mat4 u_stringData; // [COLOR_R,       COLOR_G,       COLOR_B,       COLOR_A,      \n" +
            "                           //  OUTLINE_R,     OUTLINE_G,     OUTLINE_B,     OUTLINE_WIDTH,\n" +
            "                           //  SHADOW_R,      SHADOW_G,      SHADOW_B,      SHADOW_WIDTH, \n" +
            "                           //  SHADOW_X,      SHADOW_Y,      x,             x            ]\n" +
            "varying vec2 v_coords;\n" +
            this.fragmentSource_ +
            "void main() {\n" +
            "    //gl_FragColor = u_stringData[0].rgba;\n" +
            "    //gl_FragColor = vec4(v_coords.s, v_coords.t, 0.0, 1.0);\n" +
            "    float c = texture2D(u_charMap, v_coords).a; gl_FragColor = vec4(c, c, c, 1.0);\n" +
            "    //gl_FragColor = sampleChar(u_charMap, v_coords, u_stringData);\n" +
            "}\n";

        // Drawing vertex shader
        var vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertexSource);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            var log = gl.getShaderInfoLog(vs);
            console.log("failed to compile vertex shader:");
            console.log(log);
            return false;
        }

        // Drawing fragment shader
        var fs = this.fragmentShader_ = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragmentSource);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            var log = gl.getShaderInfoLog(fs);
            console.log("failed to compile fragment shader:");
            console.log(log);
            return false;
        }

        // Drawing program
        var program = this.drawProgram_ = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.bindAttribLocation(program, 0, "a_coords");
        gl.bindAttribLocation(program, 0, "");
        gl.bindAttribLocation(program, 0, "");
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            var log = gl.getProgramInfoLog(program);
            console.log("failed to link program:");
            console.log(log);
            return false;
        }
        program.u_transform = gl.getUniformLocation(program, "u_transform");
        program.u_charMap = gl.getUniformLocation(program, "u_charMap");
        program.u_stringData = gl.getUniformLocation(program, "u_stringData");

        // Setup shared index buffer
        var indexBuffer = this.elementArrayBuffer_ = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        var quadCount = 8192;
        var indices = new Uint16Array(quadCount * 3 * 2);
        for (var n = 0, i = 0, v = 0; n < quadCount; n++, i += 6, v += 4) {
            indices[i + 0] = v + 3;
            indices[i + 1] = v + 1;
            indices[i + 2] = v + 2;
            indices[i + 3] = v + 2;
            indices[i + 4] = v + 1;
            indices[i + 5] = v + 0;
        }
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        // TODO: don't do this
        this.DUMMYBUFFER = new StringBuffer(gl, 8192);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, oldElementArrayBuffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, oldArrayBuffer);

        return true;
    };

    EXT_string_drawing.prototype.setError_ = function setError_(error) {
        console.log("error " + error);
        this.errorMap_[error] = true;
    };



    EXT_string_drawing.prototype.getStringFragmentSource = function getStringFragmentSource() {
        return this.fragmentSource_;
    };
    EXT_string_drawing.prototype.getStringFragmentShader = function getStringFragmentShader() {
        return this.fragmentShader_;
    };



    EXT_string_drawing.prototype.validateCharacterMap_ = function validateCharacterMap_(map) {
        var gl = this.gl;
        if (!map) {
            this.setError_(gl.INVALID_VALUE);
            return false;
        }
        if (!(map instanceof ExtCharacterMap)) {
            this.setError_(gl.INVALID_OPERATION);
            return false;
        }
        return true;
    };
    EXT_string_drawing.prototype.dirtyCharacterMap_ = function dirtyCharacterMap_(map) {
        if (!map.charsDirty_) {
            this.dirtyCharacterMaps_.push(map);
        }
        map.charsDirty_ = true;
    };
    EXT_string_drawing.prototype.refCharacterMap_ = function refCharacterMap_(map) {
        map.refCount_++;
    };
    EXT_string_drawing.prototype.derefCharacterMap_ = function derefCharacterMap_(map) {
        var gl = this.gl;
        map.refCount_--;
        if (map.deleted_ && !map.refCount_) {
            // Map can really be deleted
            if (map.texture) {
                gl.deleteTexture(map.texture);
                map.texture = null;
            }
        }
    };

    EXT_string_drawing.prototype.createCharacterMap = function createCharacterMap(font) {
        var gl = this.gl;
        var map = new ExtCharacterMap(gl, font);
        // ?
        return map;
    };
    EXT_string_drawing.prototype.deleteCharacterMap = function deleteCharacterMap(map) {
        var gl = this.gl;
        if (!this.validateCharacterMap_(map)) {
            return;
        }
        map.deleted_ = true;
        this.derefCharacterMap_(map);
    };
    EXT_string_drawing.prototype.isCharacterMap = function isCharacterMap(map) {
        return map && map instanceof ExtCharacterMap;
    };
    EXT_string_drawing.prototype.getCharacterMapParameter = function getCharacterMapParameter(map, pname) {
        var gl = this.gl;
        if (!this.validateCharacterMap_(map)) {
            return 0;
        }
        switch (pname) {
            case gl.DELETE_STATUS:
                return map.deleted_;
            case this.CHARACTER_MAP_FONT_ATTRIBUTES:
                var font = {};
                for (var name in map.font_) {
                    font[name] = map.font_[name];
                }
                return font;
            default:
                this.setError_(gl.INVALID_ENUM);
                return 0;
        }
    };
    EXT_string_drawing.prototype.characterMapAppendCharacters = function characterMapAppendCharacters(map, chars) {
        var gl = this.gl;
        if (!this.validateCharacterMap_(map)) {
            return;
        }
        // Scan and find all new characters
        var newChars = [];
        for (var n = 0; n < chars.length; n++) {
            var c = chars[n];
            if (map.chars_[c]) {
                continue;
            }
            var char = new ExtChar(c);
            map.chars_[c] = char; // Must modify char table here to prevent dupe adds
            newChars.push(char);
        }
        if (newChars.length) {
            // Check for capacity issues
            if (map.pendingChars_.length + newChars.length > map.freeSlots_) {
                // Out of space! Cleanup additions and fail
                for (var n = 0; n < newChars.length; n++) {
                    delete map.chars_[newChars[n].value];
                }
                this.setError_(gl.OUT_OF_MEMORY);
                return;
            }
            // Add to master pending list
            for (var n = 0; n < newChars.length; n++) {
                var char = newChars[n];
                char.slot = map.nextSlot_++;
                map.generator_.generate(char);
                map.pendingChars_.push(char);
            }
            this.dirtyCharacterMap_(map);
        }
    };
    EXT_string_drawing.prototype.characterMapAppendSet = function characterMapAppendSet(map, set) {
        var gl = this.gl;
        if (!this.validateCharacterMap_(map)) {
            return;
        }
        switch (set) {
            case this.CHARACTER_SET_ASCII:
                var s = [];
                for (var n = 0; n < 256; n++) {
                    var c = String.fromCharCode(n);
                    if (c.length) {
                        s.push(c);
                    }
                }
                this.characterMapAppendCharacters(map, s.join(""));
                break;
            default:
                this.setError_(gl.INVALID_ENUM);
                return;
        }
    };



    EXT_string_drawing.prototype.validateString_ = function validateString_(str) {
        var gl = this.gl;
        if (!str) {
            this.setError_(gl.INVALID_VALUE);
            return false;
        }
        if (!(str instanceof ExtString)) {
            this.setError_(gl.INVALID_OPERATION);
            return false;
        }
        return true;
    };
    EXT_string_drawing.prototype.dirtyStringData_ = function dirtyStringData_(str) {
        if (!str.dataDirty_ && !str.attribsDirty_) {
            this.dirtyStrings_.push(str);
        }
        str.dataDirty_ = true;
    };
    EXT_string_drawing.prototype.dirtyStringAttribs_ = function dirtyStringAttribs_(str) {
        if (str.type_ !== this.PAINTED_STRING) {
            // No attrib dirtying for DRAWN_STRING
            return;
        }
        if (!str.dataDirty_ && !str.attribsDirty_) {
            this.dirtyStrings_.push(str);
        }
        str.attribsDirty_ = true;
    };
    EXT_string_drawing.prototype.refString_ = function refString_(str) {
        str.refCount_++;
    };
    EXT_string_drawing.prototype.derefString_ = function derefString_(str) {
        str.refCount_--;
        if (str.deleted_ && !str.refCount_) {
            // String can really be deleted
            if (str.map_) {
                this.derefCharacterMap_(str.map_);
                str.map_ = null;
            }
            // TODO: delete string for real
        }
    };

    EXT_string_drawing.prototype.createString = function createString(type) {
        var gl = this.gl;

        switch (type) {
            case this.PAINTED_STRING:
            case this.DRAWN_STRING:
                break;
            default:
                this.setError_(gl.INVALID_ENUM);
                return null;
        }

        var str = new ExtString(type);
        // ?
        return str;
    };
    EXT_string_drawing.prototype.deleteString = function deleteString(str) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
        str.deleted_ = true;
        this.derefString_(str);
    };
    EXT_string_drawing.prototype.isString = function isString(str) {
        return str && str instanceof ExtString;
    };
    EXT_string_drawing.prototype.stringData = function stringData(str, map, chars, usage) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
        if (!this.validateCharacterMap_(map)) {
            return;
        }
        switch (usage) {
            case gl.STREAM_DRAW:
            case gl.DYNAMIC_DRAW:
            case gl.STATIC_DRAW:
                break;
            default:
                this.setError_(gl.INVALID_ENUM);
                return;
        }
        if (str.map_ != map) {
            if (str.map_) {
                this.derefCharacterMap_(str.map_);
            }
            str.map_ = map;
            this.refCharacterMap_(map);
        }
        str.usage_ = usage;
        str.characters_ = chars ? String(chars) : "";
        var dims = this.measureString(map, str.characters_);
        str.width_ = dims[0];
        str.height_ = dims[1];
        this.dirtyStringData_(str);
    };
    EXT_string_drawing.prototype.stringColor = function stringColor(str, red, green, blue, alpha) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
        var r = Math.min(Math.max(red, 0.0), 1.0);
        var g = Math.min(Math.max(green, 0.0), 1.0);
        var b = Math.min(Math.max(blue, 0.0), 1.0);
        var a = Math.min(Math.max(alpha, 0.0), 1.0);
        var attribData = str.attribData_;
        attribData[0] = r;
        attribData[1] = g;
        attribData[2] = b;
        attribData[3] = a;
        this.dirtyStringAttribs_(str);
    };
    EXT_string_drawing.prototype.stringOutline = function stringOutline(str, width, red, green, blue) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
        var w = Math.min(Math.max(width, 0.0), this.caps.outlineWidth);
        var r = Math.min(Math.max(red, 0.0), 1.0);
        var g = Math.min(Math.max(green, 0.0), 1.0);
        var b = Math.min(Math.max(blue, 0.0), 1.0);
        var attribData = str.attribData_;
        attribData[4] = r;
        attribData[5] = g;
        attribData[6] = b;
        attribData[7] = w;
        this.dirtyStringAttribs_(str);
    };
    EXT_string_drawing.prototype.stringShadow = function stringShadow(str, width, offsetx, offsety, red, green, blue) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
        var maxWidth = this.caps.shadowWidth;
        var maxOffset = this.caps.shadowOffset;
        var w = Math.min(Math.max(width, 0.0), maxWidth);
        var x = Math.min(Math.max(offsetx, -maxOffset), maxOffset);
        var y = Math.min(Math.max(offsety, -maxOffset), maxOffset);
        var r = Math.min(Math.max(red, 0.0), 1.0);
        var g = Math.min(Math.max(green, 0.0), 1.0);
        var b = Math.min(Math.max(blue, 0.0), 1.0);
        var attribData = str.attribData_;
        attribData[8] = r;
        attribData[9] = g;
        attribData[10] = b;
        attribData[11] = w;
        attribData[12] = x;
        attribData[13] = y;
        this.dirtyStringAttribs_(str);
    };
    EXT_string_drawing.prototype.getStringParameter = function getStringParameter(str, pname) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return 0;
        }
        var attribData = str.attribData_;
        switch (pname) {
            case gl.DELETE_STATUS:
                return str.deleted_;
            case this.STRING_TYPE:
                return str.type_;
            case this.STRING_USAGE:
                return str.usage_;
            case this.STRING_VALUE:
                return str.characters_;
            case this.STRING_WIDTH:
                return str.width_;
            case this.STRING_HEIGHT:
                return str.height_;
            case this.STRING_COLOR:
                return [attribData[0], attribData[1], attribData[2], attribData[3]];
            case this.STRING_OUTLINE_WIDTH:
                return attribData[7];
            case this.STRING_OUTLINE_COLOR:
                return [attribData[4], attribData[5], attribData[6]];
            case this.STRING_SHADOW_WIDTH:
                return attribData[11];
            case this.STRING_SHADOW_OFFSET:
                return [attribData[12], attribData[13]];
            case this.STRING_SHADOW_COLOR:
                return [attribData[8], attribData[9], attribData[10]];
            default:
                this.setError_(gl.INVALID_ENUM);
                return 0;
        }
    };



    EXT_string_drawing.prototype.prepareCharacterMap_ = function prepareCharacterMap_(map, safe) {
        var gl = this.gl;
        var oldTexture;
        if (safe) {
            oldTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
        }

        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        if (!map.texture) {
            // No texture - create new
            map.texture_ = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, map.texture_);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, map.maxSize_, map.maxSize_, 0, gl.ALPHA, gl.UNSIGNED_BYTE, null);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, map.texture_);
        }

        if (map.charsDirty_) {
            var pendingChars = map.pendingChars_;
            for (var n = 0; n < pendingChars.length; n++) {
                var char = pendingChars[n];

                var slot = char.slot;
                var sx = slot % map.slotsPerSide_;
                var sy = Math.floor(slot / map.slotsPerSide_);
                var x = sx * map.slotSize_;
                var y = sy * map.slotSize_;
                var w = map.slotSize_;
                var h = map.slotSize_;
                gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, w, h, gl.ALPHA, gl.UNSIGNED_BYTE, char.data);
            }
            pendingChars.length = 0;

            map.charsDirty_ = false;
        }

        if (safe) {
            gl.bindTexture(gl.TEXTURE_2D, oldTexture);
        }

        return true;
    };
    EXT_string_drawing.prototype.prepareString_ = function prepareString_(str, safe) {
        var gl = this.gl;

        if (str.type_ === this.DRAWN_STRING) {

            if (str.dataDirty_) {
                if (!str.buffer_) {
                    // Not yet allocated
                    str.buffer_ = this.DUMMYBUFFER;
                    this.DUMMYBUFFER.allocate(str);
                } else {
                    // TODO: reallocate
                    throw "String modification not yet implemented";
                }

                str.dataDirty_ = false;
            }

        } else if (str.type_ === this.PAINTED_STRING) {

            if (str.dataDirty_) {
                // TODO: something

                str.dataDirty_ = false;
            }

            if (str.attribsDirty_) {
                var attribData = str.attribData_;

                // TODO: something

                str.attribsDirty_ = false;
            }
        }

        return true;
    };
    EXT_string_drawing.prototype.prepareExecution_ = function prepareExecution_(safe) {
        var gl = this.gl;
        var anyFailed = false;

        var dirtyCharacterMaps = this.dirtyCharacterMaps_;
        for (var n = 0; n < dirtyCharacterMaps.length; n++) {
            var map = dirtyCharacterMaps[n];
            if (!this.prepareCharacterMap_(map, safe)) {
                anyFailed = true;
                break;
            }
        }
        if (anyFailed) {
            // Remove already processed and return
            dirtyCharacterMaps.splice(0, n);
            this.setError_(gl.OUT_OF_MEMORY);
            return false;
        } else {
            dirtyCharacterMaps.length = 0;
        }

        var dirtyStrings = this.dirtyStrings_;
        for (var n = 0; n < dirtyStrings.length; n++) {
            var str = dirtyStrings[n];
            if (!this.prepareString_(str, safe)) {
                anyFailed = true;
                break;
            }
        }
        if (anyFailed) {
            // Remove already processed and return
            dirtyStrings.splice(0, n);
            this.setError_(gl.OUT_OF_MEMORY);
            return false;
        } else {
            dirtyStrings.length = 0;
        }

        return true;
    };
    EXT_string_drawing.prototype.flushStrings = function flushStrings() {
        this.prepareExecution_(true);
    };



    EXT_string_drawing.prototype.measureString = function measureString(map, chars) {
        var gl = this.gl;
        if (!this.validateCharacterMap_(map)) {
            return;
        }

        var w = 0;
        var h = map.charHeight_;

        for (var n = 0; n < chars.length; n++) {
            var c = chars[n];
            var char = map.chars_[c];
            if (!char) {
                this.setError_(gl.INVALID_OPERATION);
                return [0, 0];
            }
            w += char.width;
            // TODO: spacing
            w += 1;
        }

        return [w, h];
    };



    EXT_string_drawing.prototype.drawString = function drawString(str) {
        //(ExtString str, Float32Array matrix); // 4x4 world->ndc
        //(ExtString str, float x, float y, float z, float scale);
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
        if (str.deleted_ || !str.map_) {
            this.setError_(gl.INVALID_OPERATION);
            return;
        }

        if (!this.prepareExecution_(false)) {
            return;
        }

        var map = str.map_;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, map.texture_);

        var program = this.drawProgram_;
        gl.useProgram(program);
        gl.uniform1i(program.u_charMap, 0);
        gl.uniformMatrix4fv(program.u_stringData, false, str.attribData_);

        // Transform - either pass through directly or 
        var transform;
        if (arguments.length == 2) {
            // Matrix - pass directly through
            transform = arguments[1];
        } else {
            // x, y in window coordinates
            transform = new Float32Array(16);

            var vw = 500.0;
            var vh = 500.0;

            var s = Number(arguments[4]);
            var sx = s / vw * 2;
            var sy = s / vh * 2;
            var tx = (Number(arguments[1]) / vw - 0.5) * 2;
            var ty = (Number(arguments[2]) / vh - 0.5) * 2;
            var tz = Number(arguments[3]);

            transform[0] = sx;
            transform[1] = 0;
            transform[2] = 0;
            transform[3] = 0;

            transform[4] = 0;
            transform[5] = sy;
            transform[6] = 0;
            transform[7] = 0;

            transform[8] = 0;
            transform[9] = 0;
            transform[10] = 1;
            transform[11] = 0;

            transform[12] = tx;
            transform[13] = -ty;
            transform[14] = tz;
            transform[15] = 1;

            // TODO: scale, translate, etc
        }
        gl.uniformMatrix4fv(program.u_transform, false, transform);

        // TODO: set attributes
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementArrayBuffer_);
        gl.bindBuffer(gl.ARRAY_BUFFER, str.buffer_.arrayBuffer_);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 4, gl.SHORT, false, 0, 0);

        var charCount = str.characters_.length;
        var offset = str.bufferOffset_ / (4 * 4);
        gl.drawElements(gl.TRIANGLES, 2 * 3 * charCount, gl.UNSIGNED_SHORT, offset);
    };

    EXT_string_drawing.prototype.useString = function useString(str, program) {
        var gl = this.gl;
        if (str === null) {
            // Clear CURRENT_STRING
            this.currentString_ = null;
            return;
        }
        if (!this.validateString_(str)) {
            return;
        }
        if (str.deleted_) {
            this.setError_(gl.INVALID_OPERATION);
            return;
        }
        if (!gl.isProgram(program)) {
            this.setError_(gl.INVALID_OPERATION);
            return;
        }

        if (this.currentString_ !== str) {
            if (this.currentString_) {
                this.derefString_(this.currentString_);
            }
            this.currentString_ = str;
            this.refString_(str);
        }
        gl.useProgram(program);

        if (!this.prepareExecution_(false)) {
            return;
        }

        // TODO: use
        throw "Not Implemented";
    };






    // Install the hooks onto the WebGLRenderingContext to support the extension query,
    // setting of custom errors, state queries, etc
    (function (proto) {

        // getSupportedExtensions: include extension in the enumeration
        var original_getSupportedExtensions = proto.getSupportedExtensions;
        proto.getSupportedExtensions = function getSupportedExtensions() {
            var list = original_getSupportedExtensions.call(this);
            list.push("EXT_string_drawing");
            return list;
        };

        // getExtension: allocate/return extension object
        var original_getExtension = proto.getExtension;
        proto.getExtension = function getExtension(name) {
            if (name === "EXT_string_drawing") {
                if (!this.EXT_string_drawing_) {
                    this.EXT_string_drawing_ = new EXT_string_drawing(this);
                }
                return this.EXT_string_drawing_;
            }
            return original_getExtension.call(this, name);
        };

        // getError: return errors that occurred on the extension
        var original_getError = proto.getError;
        proto.getError = function getError() {
            var ext = this.EXT_string_drawing_;
            if (ext) {
                var errorMap = ext.errorMap_;
                for (var error in errorMap) {
                    if (errorMap[error]) {
                        errorMap[error] = false;
                        return error;
                    }
                }
            }
            return original_getError.call(this);
        };

        // getParameter: support CURRENT_STRING and other state
        var original_getParameter = proto.getParameter;
        proto.getParameter = function getParameter(pname) {
            var ext = this.EXT_string_drawing_;
            if (ext) {
                switch (pname) {
                    case ext.MAX_STRING_LENGTH:
                        return ext.caps.stringLength;
                    case ext.MAX_STRING_OUTLINE_WIDTH:
                        return ext.caps.outlineWidth;
                    case ext.MAX_STRING_SHADOW_WIDTH:
                        return ext.caps.shadowWidth;
                    case ext.MAX_STRING_SHADOW_OFFSET:
                        return ext.caps.shadowOffset;
                    case ext.CURRENT_STRING:
                        return ext.currentString_;
                }
            }
            return original_getParameter.call(this, pname);
        };

        // useProgram: reset CURRENT_STRING
        var original_useProgram = proto.useProgram;
        proto.useProgram = function useProgram(program) {
            var ext = this.EXT_string_drawing_;
            if (ext) {
                ext.currentString_ = null;
            }
            return original_useProgram.call(this, program);
        };

    })(WebGLRenderingContext.prototype);

})();
