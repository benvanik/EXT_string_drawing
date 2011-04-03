(function () {

    // TODO: optimize
    var DistanceFieldGenerator = function DistanceFieldGenerator(font) {
        var canvas = this.canvas = document.createElement("canvas");
        var frag = document.createDocumentFragment();
        frag.appendChild(canvas);

        var ctx = this.ctx = canvas.getContext("2d");
        var fontString = "";
        fontString += font.fontStyle + " ";
        fontString += font.fontVariant + " ";
        fontString += font.fontWeight + " ";
        fontString += font.fontSize + " ";
        fontString += font.fontFamily + " ";
        ctx.font = fontString;
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgb(0, 0, 0)";

        // Bespin does this... for some reason ^_^
        this.ascent = ctx.measureText("m").width;

        // Resize to what we think will be enough
        this.spread = 15; // TODO: tweak
        canvas.width = canvas.height = this.ascent + this.spread * 2;

        this.grid1 = new Int32Array(canvas.width * canvas.height * 2);
        this.grid2 = new Int32Array(canvas.width * canvas.height * 2);
    };
    DistanceFieldGenerator.prototype.generate = function generate(char) {
        var ctx = this.ctx;

        // Measure
        var width = ctx.measureText(c).width;
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
            t.y = ty;
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

    var ExtCharacterMap = function ExtCharacterMap(font) {
        this.font_ = {
            fontFamily: font.fontFamily || "san-serif",
            fontStyle: font.fontStyle || "normal",
            fontSize: font.fontSize || "12px",
            fontWeight: font.fontWeight || "normal",
            fontVariant: font.fontVariant || "normal"
        };
        // TODO: clamp/massage values/convert to standards

        this.generator_ = new DistanceFieldGenerator(this.font);
        this.charHeight_ = this.generator_.ascent;

        this.deleted_ = false;
        this.refCount_ = 1; // self

        this.charsDirty_ = false;
        this.pendingChars_ = [];

        this.freeSlots_ = 0;
        this.nextSlot_ = 0;
        this.chars_ = {};
    };

    var ExtString = function ExtString(type) {
        this.type = type;

        this.deleted_ = false;
        this.refCount_ = 1; // self

        this.dataDirty_ = false;
        this.attribsDirty_ = false;

        this.map_ = null;
        this.usage_ = 0;
        this.characters_ = "";
        this.width_ = 0.0;
        this.height_ = 0.0;

        this.colorRed_ = 1.0;
        this.colorGreen_ = 1.0;
        this.colorBlue_ = 1.0;
        this.colorAlpha_ = 1.0;

        this.outlineWidth_ = 0.0;

        this.glowWidth_ = 0.0;
        this.glowRed_ = 0.0;
        this.glowGreen_ = 0.0;
        this.glowBlue_ = 0.0;

        this.shadowOffsetX_ = 0.0;
        this.shadowOffsetY_ = 0.0;
        this.shadowRed_ = 0.0;
        this.shadowGreen_ = 0.0;
        this.shadowBlue_ = 0.0;
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
            glowWidth: 10.0,
            shadowOffset: 10.0
        };

        this.setupResources_();
    };

    EXT_string_drawing.prototype.MAX_STRING_LENGTH = 0x119950;
    EXT_string_drawing.prototype.MAX_STRING_OUTLINE_WIDTH = 0x119951;
    EXT_string_drawing.prototype.MAX_STRING_GLOW_WIDTH = 0x119952;
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
    EXT_string_drawing.prototype.STRING_GLOW_WIDTH = 0x119936;
    EXT_string_drawing.prototype.STRING_GLOW_COLOR = 0x119937;
    EXT_string_drawing.prototype.STRING_SHADOW_OFFSET = 0x119938;
    EXT_string_drawing.prototype.STRING_SHADOW_COLOR = 0x119939;



    EXT_string_drawing.prototype.setupResources_ = function setupResources_() {
        // TODO: initialize shaders/programs/etc
        this.fragmentSource_ = "";
        this.fragmentShader_ = null;
        throw "Not Implemented";
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
        map.refCount_--;
        if (map.deleted_ && !map.refCount_) {
            // Map can really be deleted
            // TODO: delete map for real
        }
    };

    EXT_string_drawing.prototype.createCharacterMap = function createCharacterMap(font) {
        var gl = this.gl;
        var map = new ExtCharacterMap(font);
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
        if (str.attribsDirty_ ||
            (str.colorRed_ !== r) ||
            (str.colorGreen_ !== g) ||
            (str.colorBlue_ !== b) ||
            (str.colorAlpha_ !== a)) {
            str.colorRed_ = r;
            str.colorGreen_ = g;
            str.colorBlue_ = b;
            str.colorAlpha_ = a;
            this.dirtyStringAttribs_(str);
        }
    };
    EXT_string_drawing.prototype.stringOutline = function stringOutline(str, width) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
        var w = Math.min(Math.max(width, 0.0), this.caps.outlineWidth);
        if (str.attribsDirty_ ||
            (str.outlineWidth_ !== w)) {
            str.outlineWidth_ = w;
            this.dirtyStringAttribs_(str);
        }
    };
    EXT_string_drawing.prototype.stringGlow = function stringGlow(str, width, red, green, blue) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
        var w = Math.min(Math.max(width, 0.0), this.caps.glowWidth);
        var r = Math.min(Math.max(red, 0.0), 1.0);
        var g = Math.min(Math.max(green, 0.0), 1.0);
        var b = Math.min(Math.max(blue, 0.0), 1.0);
        if (str.attribsDirty_ ||
            (str.glowWidth_ !== w) ||
            (str.glowRed_ !== r) ||
            (str.glowGreen_ !== r) ||
            (str.glowBlue_ !== r)) {
            str.glowWidth_ = w;
            str.glowRed_ = r;
            str.glowGreen_ = g;
            str.glowBlue_ = b;
            this.dirtyStringAttribs_(str);
        }
    };
    EXT_string_drawing.prototype.stringShadow = function stringShadow(str, offsetx, offsety, red, green, blue) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
        var maxOffset = this.caps.shadowOffset;
        var x = Math.min(Math.max(offsetx, -maxOffset), maxOffset);
        var y = Math.min(Math.max(offsety, -maxOffset), maxOffset);
        var r = Math.min(Math.max(red, 0.0), 1.0);
        var g = Math.min(Math.max(green, 0.0), 1.0);
        var b = Math.min(Math.max(blue, 0.0), 1.0);
        if (str.attribsDirty_ ||
            (str.shadowOffsetX_ !== x) ||
            (str.shadowOffsetY_ !== y) ||
            (str.shadowRed_ !== r) ||
            (str.shadowGreen_ !== g) ||
            (str.shadowBlue_ !== b)) {
            str.shadowOffsetX = x;
            str.shadowOffsetY = y;
            str.shadowRed_ = r;
            str.shadowGreen_ = g;
            str.shadowBlue_ = b;
            this.dirtyStringAttribs_(str);
        }
    };
    EXT_string_drawing.prototype.getStringParameter = function getStringParameter(str, pname) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return 0;
        }
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
                return [str.colorRed_, str.colorGreen_, str.colorBlue_, str.colorAlpha_];
            case this.STRING_OUTLINE_WIDTH:
                return str.outlineWidth_;
            case this.STRING_GLOW_WIDTH:
                return str.glowWidth_;
            case this.STRING_GLOW_COLOR:
                return [str.glowRed_, str.glowGreen_, str.glowBlue_];
            case this.STRING_SHADOW_OFFSET:
                return [str.shadowOffsetX_, str.shadowOffsetY_];
            case this.STRING_SHADOW_COLOR:
                return [str.shadowRed_, str.shadowGreen_, str.shadowBlue_];
            default:
                this.setError_(gl.INVALID_ENUM);
                return 0;
        }
    };



    EXT_string_drawing.prototype.prepareCharacterMap_ = function prepareCharacterMap_(map) {
        //
    };
    EXT_string_drawing.prototype.prepareString_ = function prepareString_(str) {
        //
    };
    EXT_string_drawing.prototype.prepareExecution_ = function prepareExecution_() {
        var gl = this.gl;
        var anyFailed = false;

        var dirtyCharacterMaps = this.dirtyCharacterMaps_;
        for (var n = 0; n < dirtyCharacterMaps.length; n++) {
            var map = dirtyCharacterMaps[n];
            if (!this.prepareCharacterMap_(map)) {
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
            var str = dirtystrings[n];
            if (!this.prepareString_(str)) {
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
        this.prepareExecution_();
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
        }

        return [w, h];
    };



    EXT_string_drawing.prototype.drawString = function drawString(str) {
        //(ExtString str, Float32Array matrix, float z); // 4x4 world->ndc
        //(ExtString str, float x, float y);
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
        if (str.deleted_) {
            this.setError_(gl.INVALID_OPERATION);
            return;
        }

        if (!this.prepareExecution_()) {
            return;
        }

        // TODO: draw
        throw "Not Implemented";
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

        if (!this.prepareExecution_()) {
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
                    case MAX_STRING_LENGTH:
                        return ext.caps.stringLength;
                    case MAX_STRING_OUTLINE_WIDTH:
                        return ext.caps.outlineWidth;
                    case MAX_STRING_GLOW_WIDTH:
                        return ext.caps.glowWidth;
                    case MAX_STRING_SHADOW_OFFSET:
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
