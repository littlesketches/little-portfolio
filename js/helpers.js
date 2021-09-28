
///////////////////////////////////////////////
/// VISUALISATION SETTINGS AND DATA OBJECTS ///
///////////////////////////////////////////////


function applyPencilFilterTextures(svg) {
    const defs = svg.select("defs");

    var filter = defs.append("filter")
        .attr("id","glow");
    filter.append("feGaussianBlur")
        .attr("stdDeviation","3.5")
        .attr("result","coloredBlur");
    var feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
        .attr("in","coloredBlur");
    feMerge.append("feMergeNode")
        .attr("in","SourceGraphic");

    // Yellow like
    defs.append("radialGradient").classed('radial-gradient', true)
        .attr("id", "rg-community")
        .attr("cx", "40%")	
        .attr("cy", "40%")	
        .attr("r", "50%")	
        .selectAll("stop")
        .data([
                {offset: "0%", color: "#FFF76B"},
                {offset: "50%", color: "#FFF845"},
                {offset: "90%", color: "#FFDA4E"},
                {offset: "100%", color: "#FB8933"}
            ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    // Blue
    defs.append("radialGradient")
        .attr("id", "rg-non-government-organisation")
        .attr("cx", "40%")	
        .attr("cy", "40%")	
        .attr("r", "50%")	
        .selectAll("stop")
        .data([
                {offset: "0%", color: "#85F1FF"},
                {offset: "50%", color: "#38B1E5 "},
                {offset: "90%", color: "#5B92E5"},
                {offset: "100%", color: "#11366D"}
            ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);
    defs.append("radialGradient")
        .attr("id", "rg-ngo-pro-bono")
        .attr("cx", "50%")	
        .attr("cy", "50%")	
        .attr("r", "70%")	
        .selectAll("stop")
        .data([
                {offset: "0%", color: "#85F1FF"},
                {offset: "50%", color: "#38B1E5 "},
                {offset: "90%", color: "#5B92E5"},
                {offset: "100%", color: "#11366D"}
            ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    defs.append("radialGradient").classed('radial-gradient', true)
        .attr("id", "rg-private-sector")
        .attr("cx", "40%")	
        .attr("cy", "40%")	
        .attr("r", "50%")	
        .selectAll("stop")
        .data([
                {offset: "0%", color: "#FFCCFF"},
                {offset: "50%", color: "#FF79A1 "},
                {offset: "90%", color: "#FF1A7E"},
                {offset: "100%", color: "#93003B"}
            ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);


    defs.append("radialGradient")
        .attr("id", "rg-public-sector")
        .attr("cx", "40%")	
        .attr("cy", "40%")	
        .attr("r", "50%")	
        .selectAll("stop")
        .data([
                {offset: "0%", color: "#CEFFFE"},
                {offset: "50%", color: "#47FFBF "},
                {offset: "90%", color: "#00CDC8"},
                {offset: "100%", color: "#0476AE"}
            ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    defs.append("radialGradient")
        .attr("id", "rg-not-for-profit")
        .attr("cx", "40%")	
        .attr("cy", "40%")	
        .attr("r", "50%")	
        .selectAll("stop")
        .data([
                {offset: "0%", color: "#CEC5FE"},
                {offset: "50%", color: "#936BD3 "},
                {offset: "90%", color: "#9030D0"},
                {offset: "100%", color: "#391465"}
            ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    defs.append("radialGradient")
        .attr("id", "rg-education-and-research-lab")
        .attr("cx", "30%")	
        .attr("cy", "10%")	
        .attr("r", "80%")	
        .selectAll("stop")
        .data([
                {offset: "0%", color: "#E9FFE6"},
                {offset: "50%", color: "#7BD63C "},
                {offset: "90%", color: "#84EB6B"},
                {offset: "100%", color: "#209500"}
            ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);




    const roughPaper = defs.append("filter")
        roughPaper
            .attr("x", "0%")
            .attr("y", "0%")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("filterUnits", "objectBoundingBox")
            .attr("id", "roughPaper");
        roughPaper.append("feTurbulence")
            .attr("type", "fractalNoise")
            .attr("baseFrequency", "128")
            .attr("numOctaves", "1")
            .attr("result", "noise");
    const diffLight = roughPaper.append("feDiffuseLighting");
    diffLight
        .attr("in", "noise")
        .attr("lighting-color", "white")
        .attr("surfaceScale", "1")
        .attr("result", "diffLight");
    diffLight.append("feDistantLight")
        .attr("azimuth", "145")
        .attr("elevation", "55");

    roughPaper.append("feGaussianBlur")
        .attr("in", "diffLight")
        .attr("stdDeviation", "0.75")
        .attr("result", "dlblur");
    roughPaper.append("feComposite")
        .attr("operator", "arithmetic")
        .attr("k1", "1.2")
        .attr("k2", "0")
        .attr("k3", "0")
        .attr("k4", "0")
        .attr("in", "dlblur")
        .attr("in2", "SourceGraphic")
        .attr("result", "out");

    const pencilTexture = defs.append("filter")
        .attr("x", "-2%")
        .attr("y", "-2%")
        .attr("width", "104%")
        .attr("height", "104%")
        .attr("filterUnits", "objectBoundingBox")
        .attr("id", "PencilTexture")
    pencilTexture.append("feTurbulence")
        .attr("type", "fractalNoise")
        .attr("baseFrequency", "1.2")
        .attr("numOctaves", "3")
        .attr("result", "noise")
    pencilTexture.append("feDisplacementMap")
        .attr("xChannelSelector", "R")
        .attr("yChannelSelector", "G")
        .attr("scale", "3")
        .attr("in", "SourceGraphic")
        .attr("result", "newSource");

    var pencilTexture2 = defs.append("filter")
        .attr("x", "0%")
        .attr("y", "0%")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("filterUnits", "objectBoundingBox")
        .attr("id", "pencilTexture2");
    pencilTexture2.append("feTurbulence")
        .attr("type", "fractalNoise")
        .attr("baseFrequency", 2)
        .attr("numOctaves", 5)
        .attr("stitchTiles", "stitch")
        .attr("result", "f1");
    pencilTexture2.append("feColorMatrix")
        .attr("type", "matrix")
        .attr("values", "0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -1.5 1.5")
        .attr("result", "f2");
    pencilTexture2.append("feComposite")
        .attr("operator", "in")
        .attr("in2", "f2")
        .attr("in", "SourceGraphic")
        .attr("result", "f3");

    var pencilTexture3 = defs.append("filter")
        .attr("x", "0%")
        .attr("y", "0%")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("filterUnits", "objectBoundingBox")
        .attr("id", "pencilTexture3");
    pencilTexture3.append("feTurbulence")
        .attr("type", "fractalNoise")
        .attr("baseFrequency", 0.5)
        .attr("numOctaves", 5)
        .attr("stitchTiles", "stitch")
        .attr("result", "f1");
    pencilTexture3.append("feColorMatrix")
        .attr("type", "matrix")
        .attr("values", "0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -1.5 1.5")
        .attr("result", "f2");
    pencilTexture3.append("feComposite")
        .attr("operator", "in")
        .attr("in2", "f2b")
        .attr("in", "SourceGraphic")
        .attr("result", "f3");
    pencilTexture3.append("feTurbulence")
        .attr("type", "fractalNoise")
        .attr("baseFrequency", 1.2)
        .attr("numOctaves", 3)
        .attr("result", "noise");
    pencilTexture3.append("feDisplacementMap")
        .attr("xChannelSelector", "R")
        .attr("yChannelSelector", "G")
        .attr("scale", 2.5)
        .attr("in", "f3")
        .attr("result", "f4");
    var pencilTexture4 = defs.append("filter")
        .attr("x", "-20%")
        .attr("y", "-20%")
        .attr("width", "140%")
        .attr("height", "140%")
        .attr("filterUnits", "objectBoundingBox")
        .attr("id", "pencilTexture4");
    pencilTexture4.append("feTurbulence")
        .attr("type", "fractalNoise")
        .attr("baseFrequency", 0.03)
        .attr("numOctaves", 3)
        .attr("seed", 1)
        .attr("result", "f1");
    pencilTexture4.append("feDisplacementMap")
        .attr("xChannelSelector", "R")
        .attr("yChannelSelector", "G")
        .attr("scale", 5)
        .attr("in", "SourceGraphic")
        .attr("in2", "f1")
        .attr("result", "f4");
    pencilTexture4.append("feTurbulence")
        .attr("type", "fractalNoise")
        .attr("baseFrequency", 0.03)
        .attr("numOctaves", 3)
        .attr("seed", 10)
        .attr("result", "f2");
    pencilTexture4.append("feDisplacementMap")
        .attr("xChannelSelector", "R")
        .attr("yChannelSelector", "G")
        .attr("scale", 5)
        .attr("in", "SourceGraphic")
        .attr("in2", "f2")
        .attr("result", "f5");
    pencilTexture4.append("feTurbulence")
        .attr("type", "fractalNoise")
        .attr("baseFrequency", 1.2)
        .attr("numOctaves", 2)
        .attr("seed", 100)
        .attr("result", "f3");
    pencilTexture4.append("feDisplacementMap")
        .attr("xChannelSelector", "R")
        .attr("yChannelSelector", "G")
        .attr("scale", 3)
        .attr("in", "SourceGraphic")
        .attr("in2", "f3")
        .attr("result", "f6");
    pencilTexture4.append("feBlend")
        .attr("mode", "multiply")
        .attr("in2", "f4")
        .attr("in", "f5")
        .attr("result", "out1");
    pencilTexture4.append("feBlend")
        .attr("mode", "multiply")
        .attr("in", "out1")
        .attr("in2", "f6")
        .attr("result", "out2");
};