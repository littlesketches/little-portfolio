///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///  ---------------------------------------------------------  ///
///  LITTLE SKETCHES PORTFOLIO VISUALISATION TOOL               ///
///  ---------------------------------------------------------  ///
///  Experiments in network visualisation                       ///
///  This will probably be open sourced under MIT license or    ///
///  something permissive but is copyright by Little Sketches   ///
///  while in prototyping and development                       ///
///                                                             ///
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
  

///////////////////////////////////////////////
/// VISUALISATION SETTINGS AND DATA OBJECTS ///
///////////////////////////////////////////////

    const settings = {
        svgID:          'portfolio-vis',
        dims: {
            width:      1080,
            height:     1080,
            margin: {
                top: 100, left: 50, right: 50, bottom: 100
            }
        },
        geometry: {
            node: {},
            icon: {
                heart: "M.047.937c.319-.51.881-.96.89-1.247.021-.672-.635-.796-.891-.398-.742-.605-1.008.147-.982.404.063.452.402.858.983 1.241z",
                heart750: "M5.003 99.219C38.72 45.148 98.255-2.476 99.169-32.771c2.161-71.106-67.18-84.275-94.343-42.143-78.49-63.995-106.688 15.548-103.852 42.734 6.66 47.818 42.473 90.785 104.029 131.399Z",
                beaker: "M-.346-.938c-.162 0-.16.206 0 .217l-.012.474-.562.852c-.07.146.08.335.27.332H.685c.144 0 .319-.183.227-.332L.376-.25v-.476c.147-.005.129-.21 0-.21z" 
            }
        },
        layout: {
            nodeExtras:         false,
            type:               'byProjects',
            centralLinks:       'root-only'
        },
        clusters: {
            orgType: {},
        },
        scales: {
            feeSize: { // Range description for' under' domain
                domain:     [1,         1000,     10000,    25000,      50000,              100000],
                range:      ['free',    'tiny',   'little', 'mid-size', 'considerable',    'big']
            }
        },
        labels:{
            map: {
                ctg_domains:        "Domain knowledge",
                ctg_tech:           "Tools and technologies",
                ctg_skills:         "Capabilities",
                ctg_themes:         "Little threads",
            }
        }
    }

    const data = {
        table:      {},
        schema:     {},
        list:       {},
        chart: {
            byProject: {
                nodes:      [],
                links:      []
            },
            byWorkBreakdown: {
                nodes:      [],
                links:      []
            },
            byNetwork: {
                nodes:      [],
                links:      []
            }
        }
    }

    const vis =  {
        state: {
            mode:               'dark',
            visibility: {
                links:                  '',
                yearLabels:             '',
                clusterLabels:          '',
                centralClusterLabel:    '',
                // Filter effects
                sketch:                 false,
                glow:               true,

            },   
            layout: {
                nodeScale:      1,
                lsNodeScale:    1,
                lsNodeScale:    1,
                ratingName:     'fame',
                clusterType:    'orgType',
                clusterGroup:   'domains',
                clusterFocus:   'Choose',
            },
            sim: {
                name:          'circle',  //clusterHuddle,  circle, timelineX, timelineXY, timelineSpiral, constellationRadial, constellationHorizon
            }
        },
        data:               {},
        els:                {},
        scales:             {},
        methods: {
            ui:{
                drag: (simulation) => {
                    function dragstarted(event, d) {
                        if (!event.active) {
                            simulation
                                .alphaTarget(0.3)
                                .restart()
                        };
                        event.subject.fx = event.subject.x;
                        event.subject.fy = event.subject.y;
                        vis.els.svg.classed('sketch', false)
                    }
                    function dragged(event, d) {
                        event.subject.fx = event.x;
                        event.subject.fy = event.y;
                    }                
                    function dragended(event, d) {
                        if (!event.active) simulation.alphaTarget(0.01);
                        event.subject.fx = null;
                        event.subject.fy = null;
                    }
                    return d3.drag()
                        .on("start", dragstarted)
                        .on("drag", dragged)
                        .on("end", dragended);
                },
                updateSimLayout: (name) => {
                    console.log('Running sim layout for  > '+name)
                    // 0. Clear non-network elements  and resize nodes 
                    d3.selectAll('.gridline').remove()   
                   
                    // 1. Update simulation 
                    if(typeof vis.state.simulation !== 'undefined') vis.state.simulation.stop()     // Stop the current simulation
                    vis.state.sim.name = name                                                       // Update state
                    helpers.execFn(vis.state.sim.name, vis.methods.forceSimulation)                 // Call function by name to update simulation
                    vis.els.node.call(vis.methods.ui.drag(vis.state.simulation))                    // Update drag handler with new sim
                    vis.state.simulation                                                            // Start tick function for new sim
                        .on('tick', onTick)
                        .on('end', onEnd) 

                    // 2. Update the layout settings   
                    d3.selectAll('.project-link').transition().duration(500).style('opacity', vis.state.visibility.links ? null : 0)
                    d3.selectAll('.year-node-label').transition().duration(500).style('opacity', vis.state.visibility.yearLabels ? null : 0)
                    d3.selectAll('.orgType-node-label').transition().duration(500).style('opacity', vis.state.visibility.clusterLabels ? null : 0)
                    d3.selectAll('.cluster-node-label').transition().duration(500).style('opacity', vis.state.visibility.centralClusterLabel ? null : 0)

                    vis.methods.layout.nodeResize()

                    // X. Tick handlers
                    function onTick(){
                        vis.els.link.attr("x1", d => d.source.x)
                            .attr("y1", d => d.source.y)
                            .attr("x2", d => d.target.x)
                            .attr("y2", d => d.target.y);
                        vis.els.node.attr("transform", d => `translate(${d.x}, ${d.y})`)
                    };

                    function onEnd(){
                        // vis.els.svg.classed('sketch', vis.state.visibility.sketch)
                        // vis.els.svg.classed('glow', vis.state.visibility.glow)
                        console.log('ENDED')
                    };
                }
            },
            layout: {
                nodeResize: (nodeScale = vis.state.layout.nodeScale, lsNodeScale = vis.state.layout.lsNodeScale) => {
                    // a. Update scale and all project nodes
                    vis.scales.valueRadius.range([settings.geometry.node.min * nodeScale, settings.geometry.node.max * nodeScale])

                    d3.selectAll('.project-value-bg').transition().duration(1000)
                        .attr('d', d => helpers.circlePath(vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS + d3.sum(data.schema.projects[d.__proto__.id].value_partners)) ) ) 
            
                    d3.selectAll('.node-bg:not(.pro-bono, .lab), .project-node:not(.pro-bono, .lab), .project-node-outline:not(.pro-bono, .lab)').transition().duration(1000)
                        .attr("d", d =>  helpers.circlePath(vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS))  )

                    d3.selectAll('.node-bg.pro-bono, .node-bg.lab, .project-node.pro-bono, .project-node.lab, .project-node-outline.pro-bono, .project-node-outline.lab').transition().duration(1000)
                        .attr("transform", d =>  `scale(${vis.scales.valueRadius(data.schema.projects[d.__proto__.id].value_LS)})`  )

                    // b. Update scale of the LS node
                    d3.select('.ls-node-icon-container').transition().duration(1000)
                        .attr("transform", d =>  `scale(${lsNodeScale})`  )

                }
            }
        } 
    }

    const helpers = {
        circlePath:  (r, cx = 0, cy = 0) => `M ${cx - r}, ${cy} a ${r},${r} 0 1,0 ${r * 2}, 0 a ${r},${r} 0 1,0 -${r * 2},0`,
        execFn:     function(fnName, ctx, args = null){
            args = Array.prototype.slice.call(arguments, 2);
            return ctx[fnName].apply(ctx, args);
        },
        slugify: function (str) {
            str = str.replace(/^\s+|\s+$/g, '').toLowerCase(); // trim           
            const from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;",      // remove accents, swap ñ for n, etc
                to   = "aaaaeeeeiiiioooouuuunc------"
            for (var i=0, l=from.length ; i<l ; i++) {
                str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
            }
            str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
                .replace(/\s+/g, '-') // collapse whitespace and replace by -
                .replace(/-+/g, '-'); // collapse dashes
            return str;
        },
        wrap: function(text, width, lineHeight, centerVertical = true) {
            text.each(function() {
                let text = d3.select(this),
                    words = text.text().split(/\s+/).reverse(),
                    word,
                    line = [],
                    lineNumber = 0,
                    y = text.attr("y"),
                    x = text.attr("x"),
                    fontSize = parseFloat(text.style("font-size")),
                    dy = parseFloat(text.attr("dy")),
                    tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));

                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan")
                            .attr("x", x)
                            .attr("y",  y)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    }                    
                }            
                if(centerVertical){
                    text.style("transform",  "translateY(-"+(10 * (lineNumber))+"px)")
                }
            })
        }
    }


///////////////////////////////////////////////////////
/// BUILD METHODS: DATA HANDLING AND VIS RENDERING  ///
///////////////////////////////////////////////////////

buildVis()
function buildVis(){
    // Load datasets, parse, transform and render
    const dataURLs = {
        timeline:       'https://docs.google.com/spreadsheets/d/e/2PACX-1vQU3czdKE8H9dh03v3M6_nKZUx0C0u9AzdJDBFqzT4-vCOkQk-sgoBwYKdq4lFrkB1CmK_Toonl7Ei0/pub?gid=0&single=true&output=tsv',
        projects:       'https://docs.google.com/spreadsheets/d/e/2PACX-1vQU3czdKE8H9dh03v3M6_nKZUx0C0u9AzdJDBFqzT4-vCOkQk-sgoBwYKdq4lFrkB1CmK_Toonl7Ei0/pub?gid=183949023&single=true&output=tsv',
        stakeholders:   'https://docs.google.com/spreadsheets/d/e/2PACX-1vQU3czdKE8H9dh03v3M6_nKZUx0C0u9AzdJDBFqzT4-vCOkQk-sgoBwYKdq4lFrkB1CmK_Toonl7Ei0/pub?gid=1032273867&single=true&output=tsv'
    }

    Promise.all(
        Object.values(dataURLs).map(link => d3.tsv(link))       
    ).then( rawData => {
        rawData.forEach((tableData, i) => {  parseTable(Object.keys(dataURLs)[i], tableData) })
        return data
    }).then( async (data) => {
        await transformData(data.table)       
        await renderVis(data, settings)                                    
    })

    // X. Table data parsing function: trim() header white space and prase numbers with "$" and "," stripped. 
    const parseTable = (tableName, tableData) => {
        data.table[tableName] = tableData.map(row => {
            const newObj = {}
            Object.entries(row).forEach(([key, value]) => {
                switch(key.trim().toLowerCase()){
                    case 'date':
                        newObj[key.trim()] =  d3.utcParse("%d-%b-%y")(value)
                        break     
                    default:
                        newObj[key.trim()] = isNaN(parseFloat(value.replace(/\$|,/g, ''))) ? value  : parseFloat(value.replace(/\$|,/g, '')) 
                }
            })
            return newObj
        })
    };                     
}; // end buildVis()


async function transformData(){

    /////////////////////////////////  
    /// CREATE META DATA OBJECTS  ///
    /////////////////////////////////

    // 1. Projects data
    data.schema.projects = {}
    for(projObj of data.table.projects){
        // a. Create partners array
        const partners = []
        for(key of Object.keys(projObj).filter(d => d.slice(0,9).toLocaleLowerCase() === 'partners_')){
            if(projObj[key] !== ''){
                partners.push(projObj[key])
            }
        }

        // b. Create parents array
        const parentIds = []
        if(projObj.link_direct      !== ""){ parentIds.push(projObj.link_direct) }
        if(projObj.link_indirect    !== ""){ parentIds.push(projObj.link_indirect) }
        if(projObj.link_network    !== ""){ parentIds.push(projObj.link_network) }
// console.log(projObj)
        // c. Reshape projects data
        data.schema.projects[projObj.id] = {
            activeName:         projObj.active_name !== '' ? projObj.active_name : null,
            name:               projObj.name,
            client:             projObj.client,
            description:        projObj.description !== '' ? projObj.description : null,
            org_lead:           projObj.partners_lead === '' ? 'Little Sketches' : projObj.partners_lead,
            org_partners:       partners,
            value_LS:           d3.sum(data.table.timeline.filter(d => d.project_id === projObj.id).map(d => d.fee)),
            value_partners:     projObj.partner_fees !== '' ? JSON.parse(projObj.partner_fees) : [],

            rtg_fame:           !isNaN(projObj.rtg_fame)    ?  +projObj.rtg_fame : null,
            rtg_fortune:        !isNaN(projObj.rtg_fortune) ?  +projObj.rtg_fortune : null,
            rtg_fun:            !isNaN(projObj.rtg_fun)     ?  +projObj.rtg_fun : null,
            rtg_ave:            !isNaN(projObj.rtg_ave)     ?  +projObj.rtg_ave : null,

            ctg_roles:          projObj.ctg_roles !== '' ? JSON.parse(projObj.ctg_roles) : [],
            ctg_skills:         projObj.ctg_skills !== '' ? JSON.parse(projObj.ctg_skills) : [],
            ctg_tech:           projObj.ctg_tech !== '' ? JSON.parse(projObj.ctg_tech) : [],
            ctg_thinking:       projObj.ctg_thinking !== '' ? JSON.parse(projObj.ctg_thinking) : [],
            ctg_themes:         projObj.ctg_themes !== '' ? JSON.parse(projObj.ctg_themes) : [],
            ctg_domains:        projObj.ctg_domains !== '' ? JSON.parse(projObj.ctg_domains) : [],

            project_type:       projObj.ctg_type !== '' ? projObj.project_type : null,
            project_url:        projObj.project_URL !== '' ? projObj.project_URL : null,
            workObjects:        data.table.timeline.filter(d => d.project_id === projObj.id),

            network_parents:    parentIds,
            network_children:   []
        }
    }

    // d. Re-loop to find and add all children
    for(projArray of Object.entries(data.schema.projects)){
        if(projArray[1].network_parents.length > 0){
            projArray[1].network_parents.forEach(id =>  data.schema.projects[id].network_children.push(projArray[0]) )
        }
    }

    // 2. Stakeholder org data
    data.schema.orgs = {}
    for(orgObj of data.table.stakeholders){
        data.schema.orgs[orgObj.name] = orgObj
        delete orgObj.name
    }

    // 3. Create Lists
    data.list.dates     = data.table.timeline.map(d => d.date)
    data.list.years     = [...new Set(data.table.timeline.map(d => +d3.timeFormat('%Y')(d.date) ) )].sort().concat([d3.max(data.list.dates).getFullYear() + 1 ])
    data.list.clients   = [...new Set(data.table.projects.map(d => d.client))].sort()
    data.list.project_ave_rating     = [...new Set(data.table.projects.map(d => d.rtg_ave))]
    data.list.project_fun_rating     = [...new Set(data.table.projects.map(d => d.rtg_fun))]
    data.list.project_fortune_rating = [...new Set(data.table.projects.map(d => d.rtg_fortune))]
    data.list.project_fame_rating    = [...new Set(data.table.projects.map(d => d.rtg_fame))]

    data.list.project = {
        themes:         [... new Set( d3.merge(Object.values(data.schema.projects).map(d => d.ctg_themes).filter(d => d)) )].sort( (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()) ),
        roles:          [... new Set( d3.merge(Object.values(data.schema.projects).map(d => d.ctg_roles).filter(d => d)) )].sort( (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()) ),
        skills:         [... new Set( d3.merge(Object.values(data.schema.projects).map(d => d.ctg_skills).filter(d => d)) )].sort( (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()) ),
        tech:           [... new Set( d3.merge(Object.values(data.schema.projects).map(d => d.ctg_tech).filter(d => d)) )].sort( (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()) ),
        thinking:       [... new Set( d3.merge(Object.values(data.schema.projects).map(d => d.ctg_thinking).filter(d => d)) )].sort( (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()) ),
        domains:        [... new Set( d3.merge(Object.values(data.schema.projects).map(d => d.ctg_domains).filter(d => d)) )].sort( (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()) ),
        type:           [... new Set( Object.values(data.schema.projects).map(d => d.project_type).filter(d => d)) ].sort( (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()) )
    }

    data.list.lead_partners             = [...new Set(data.table.projects.map(d => d.partners_Lead))].sort()
    data.list.projectValues_LS          = Object.values(data.schema.projects).map(d => d.value_LS)
    data.list.projectValues_partners    = Object.values(data.schema.projects).map(d => d3.sum(d.value_partners ))
    data.list.projectValues_total       = data.list.projectValues_LS.map( (d, i) => d + data.list.projectValues_partners[i]) 
    data.list.orgType                   = [...new Set(data.table.stakeholders.map(d => d.type)) ].sort()

    // 4. Create wide date range
    const startYear     = d3.min(data.list.dates).getFullYear(),
        endYear         = d3.max(data.list.dates).getFullYear() + 1
    data.list.yearDates     = Array.from(Array(endYear - startYear + 1).keys()).map( d => new Date(d + startYear, 0, 1))


    ///////////////////////////////////
    /// CREATE NODE-LINK STRUCTURE  ///
    ///////////////////////////////////

    let centralLinks = []
    // a. Create root links
    switch(settings.layout.type){
        case 'byProjects':
            // Node array concatenated for centreline (LS) year markers and projects
            const lsNode = [{id: "ls_000",  name: "Little Sketches", type: 'ls-node' }] 
            const yearNodes = data.list.years.map(year => { 
                return {
                    id:        `year_${year}`,
                    name:       year,
                    type:      'year-node',
                }
            })
            const orgTypeNodes = data.list.orgType.map(orgType => {
                return {
                    id:        `orgType_${helpers.slugify(orgType)}`,
                    name:       orgType,
                    type:      'orgType-node',                    
                } 
            })
            const innerCluster = [ { id:  `cluster-inner`,     name: 'inner-cluster',       type: 'inner-cluster-node' }]

            data.chart.byProject.nodes =  yearNodes 
                .concat(lsNode)
                .concat(orgTypeNodes)
                .concat(innerCluster)
                .concat(data.table.projects)

            // Link array 
            // a. Make a connection to the centreline node
            switch(settings.layout.centralLinks){
                case 'all':
                    // a. Make a connection to the centreline node
                    centralLinks = data.table.projects.map(obj => {
                        return {
                            source:     data.chart.byProject.nodes[0].id,
                            target:     obj.id,
                            class:      'root'
                        }
                    })
                    break

                case 'root-only':
                    centralLinks = data.table.projects.filter(d => d.link_direct === "" && d.link_indirect === "" &&  d.link_network === "").map(obj => {
                        return {
                            source:     data.chart.byProject.nodes[0].id,
                            target:     obj.id,
                            class:      'root'
                        }
                    })
                    break
            }
            break

        case 'workload':

            break

        default:         
    }

    // b. Create network branch links
    const intermediateLinks = []
    for( projObj of data.table.projects){
        if(projObj.link_direct !== ''){
            intermediateLinks.push({
                source:     projObj.link_direct,
                target:     projObj.id,
                class:      'direct'
            })
        }
        if(projObj.link_indirect !== ''){
            intermediateLinks.push({
                source:     projObj.link_indirect,
                target:     projObj.id,
                class:      'indirect'
            })
        }
        if(projObj.link_network !== ''){
            intermediateLinks.push({
                source:     projObj.link_network,
                target:     projObj.id,
                class:      'network'
            })
        }
    } 

    // c. Set links to use/display
    data.chart.byProject.links = intermediateLinks
}; // end transformData()


async function renderVis(data, settings){
    // Chart area and layers
    vis.els.svg = d3.select(`#${settings.svgID}`)
        .classed('centre-svg', true)
        .attr('viewBox',  `0 0 ${settings.dims.width} ${settings.dims.height} `)

    // Add filters in defs
    applyPencilFilterTextures(vis.els.svg)

    const chartArea = vis.els.svg.append('g').attr('id', 'chart-group')
        .attr('transform', `translate(${settings.dims.margin.left}, ${settings.dims.margin.top})`)

    // Set responsive dims
    const width         = settings.dims.width - settings.dims.margin.left - settings.dims.margin.right,
        height          = settings.dims.height - settings.dims.margin.top - settings.dims.margin.bottom,
        centreline      = {x: width * 0.5 + settings.dims.margin.left, y: height * 0.5 + settings.dims.margin.top },
        oneQuarter      = {x: width * 0.25 + settings.dims.margin.left, y: height * 0.25 + settings.dims.margin.top },
        oneThird        = {x: width * 0.3333 + settings.dims.margin.left, y: height * 0.3333 + settings.dims.margin.top },
        twoThird        = {x: width * 0.6667 + settings.dims.margin.left, y: height * 0.6667 + settings.dims.margin.top },
        threeQuarter    = {x: width * 0.75 + settings.dims.margin.left, y: height * 0.75 + settings.dims.margin.top }

    settings.geometry.node = {
        min:            settings.dims.width / 1080 , 
        max:            settings.dims.width / 1080 * 50, 
        centre:         settings.dims.width / 1080 * 100,
        cluster:        settings.dims.width / 1080 * 60,
        centralCluster:  settings.dims.width / 1080 * 130
    }

    // Set clusters 
    setClusterPositions()

    // Set scales
    vis.scales = {
        timeX:          d3.scaleTime().domain(d3.extent(data.list.yearDates ))
                            .range([settings.dims.margin.left,  settings.dims.width - settings.dims.margin.right * 1.5]),
        timeY:          d3.scaleTime().domain(d3.extent(data.list.yearDates))
                            .range([centreline.y + height * 0.45,  centreline.y - height * 0.3 ]),
        timeRadial:     d3.scaleLinear().domain(d3.extent(data.list.dates))
                            .range([width * 0.15, width * 0.45]),

        valueRadius:    d3.scaleSqrt().domain(d3.extent(data.list.projectValues_LS))
                            .range([settings.geometry.node.min, settings.geometry.node.max]),
        valueY:         d3.scaleLinear().domain(d3.extent(data.list.projectValues_LS))
                            .range([threeQuarter.y,  oneQuarter.y]),

        rtgAveY:        d3.scaleLinear().domain(d3.extent(data.list.project_ave_rating))
                            .range([settings.dims.height - settings.dims.margin.bottom * 1.5, settings.dims.margin.top ]),
        rtgFunY:        d3.scaleLinear().domain(d3.extent(data.list.project_fun_rating))
                            .range([settings.dims.height - settings.dims.margin.bottom * 1.5, settings.dims.margin.top ]),
        rtgFortuneY:    d3.scaleLinear().domain(d3.extent(data.list.project_fortune_rating))
                            .range([settings.dims.height - settings.dims.margin.bottom * 1.5, settings.dims.margin.top ]),
        rtgFameY:       d3.scaleLinear().domain(d3.extent(data.list.project_fame_rating))
                            .range([settings.dims.height - settings.dims.margin.bottom * 1.5, settings.dims.margin.top ]),

        valueIconScale: d3.scaleSqrt().domain(d3.extent(data.list.projectValues_LS))
                            .range([0.2, 2]),

        valueIconPath:  d3.scaleSqrt().domain(d3.extent(data.list.projectValues_LS))
                            .range([1, 2]),

        valueThickness: d3.scaleSqrt().domain(d3.extent(data.list.projectValues_LS))
                            .range([0.75, 2]),

        valueCharge:    d3.scaleSqrt().domain(d3.extent(data.list.projectValues_LS))
                            .range([10, 100]),
        timeRadius:     d3.scaleLinear().domain(d3.extent(data.list.dates))
                            .range([settings.geometry.node.centre * 2, width * 0.45]),

        feeSize:        d3.scaleOrdinal().domain([0, 1, 2, 3, 4, 5])
                            .range(settings.scales.feeSize.range),

        bins: {
            fees:           d3.bin().domain([0, d3.max(data.list.projectValues_LS)] )
                                .thresholds(settings.scales.feeSize.domain)
                                (data.list.projectValues_LS)
                            , 
            projectValue:   d3.bin().domain([0, d3.max(data.list.projectValues_total)])
                                .thresholds([0, 1, 1000, 10000, 25000, 50000, 100000])
        }

    }

    // Add background
    // chartArea.append('rect').classed('bg-layer rough-paper', true)
    //     .attr('width', width)
    //     .attr('height', height)


    /////////////////////////////
    //// FORCE SIMULATIONS   ////
    /////////////////////////////

    // a. Node and lnk data
    vis.data.links = data.chart.byProject.links.map(d => Object.create(d));
    vis.data.nodes = data.chart.byProject.nodes.map(d => Object.create(d));

    // b. Simulation options (set by functions)
    vis.methods.forceSimulation = {
        clusterHuddle: () => { 
            // 0.  Set link and label visibility, and node scales
            vis.state.visibility.yearLabels = false
            vis.state.visibility.clusterLabels = false
            vis.state.visibility.centralClusterLabel = false
            vis.state.visibility.links = false
            vis.state.layout.nodeScale = 1
            vis.state.layout.lsNodeScale = 1
            vis.methods.layout.nodeResize()

            // 1 .Set new simulation forces
            vis.state.simulation  =  d3.forceSimulation(vis.data.nodes)
                .force("charge", d3.forceManyBody().strength(d => d.__proto__.type  ? 0 : 0.1))
                .force("centre", d3.forceCenter(centreline.x, centreline.y).strength(0.1) )
                .force("collision", d3.forceCollide()
                    .radius( d =>  d.__proto__.type === 'ls-node' ? settings.geometry.node.centre 
                        :  d.__proto__.type ?  0
                            : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS)  + (settings.dims.width / 1080 * 2.5)
                    )
                )
                .force("x", d3.forceX().x(centreline.x)
                    .strength( d => d.__proto__.type ? 1 : 0.1)
                )
                .force("y", d3.forceY()
                    .y(d => d.__proto__.type === 'ls-node' ?  oneQuarter.y 
                        : d.__proto__.type === 'year-node'  || d.__proto__.type === 'orgType-node'? -oneThird.y : centreline.y
                    )
                    .strength( d => d.__proto__.type ? 1 : 1)
                )
                .force("radial", null)
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(null) )

            // 2. Fixed node settings for non-project nodes (year labels and central node)
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = centreline.x
                vis.data.nodes[i].fy = oneQuarter.y
            })
            vis.data.nodes[data.list.years.length].fx = null
            vis.data.nodes[data.list.years.length].fy = null
        },

        clusterMultiFoci: (type = vis.state.layout.clusterType ) => { 
            // 0.  Set link and label visibility, and node scales
            vis.state.visibility.yearLabels = false
            vis.state.visibility.clusterLabels = true
            vis.state.visibility.centralClusterLabel = false
            vis.state.visibility.links = false
            vis.state.layout.nodeScale = 0.7
            vis.state.layout.lsNodeScale = 0.7
            vis.methods.layout.nodeResize()

            // 1. Set Cluster positions
            const clusterNames = data.list[vis.state.layout.clusterType],
                clusterPos =  settings.clusters[vis.state.layout.clusterType]            

            // 2 .Set new simulation forces
            vis.state.simulation  =  d3.forceSimulation(vis.data.nodes)
                .force("charge", d3.forceManyBody().strength(d => d.__proto__.type  ? 0 : -0.3))
                .force("centre", null )
                .force("collision", d3.forceCollide()
                    .radius( d =>  d.__proto__.type === 'ls-node' ? settings.geometry.node.centre 
                        :  d.__proto__.type === 'year-node' || d.__proto__.type === 'inner-cluster-node' || d.__proto__.type === 'outer-cluster-node' ? 0
                            : d.__proto__.type === 'orgType-node' ? settings.geometry.node.cluster * 0.8
                                : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS)  * (settings.dims.width / 1080 * 1.25)
                    ).strength(1.2)
                )
                .force("x", d3.forceX()
                    .x( d => { 
                        let clusterName, clusterIDX
                        if(typeof d.__proto__.client !== 'undefined'){
                            clusterName =   data.schema.orgs[d.__proto__.client].type
                            clusterIDX =  clusterNames.indexOf(clusterName)
                        }
                        return d.__proto__.type ? centreline.x  : clusterPos[clusterIDX].x
                    })
                    .strength( d => d.__proto__.type ? 1 : 0.1)
                )
                .force("y", d3.forceY()
                    .y(d => {
                        let clusterName, clusterIDX
                        if(typeof d.__proto__.client !== 'undefined'){
                            clusterName = data.schema.orgs[d.__proto__.client].type
                            clusterIDX =  clusterNames.indexOf(clusterName)
                        }
                        return d.__proto__.type ? centreline.y  : clusterPos[clusterIDX].y
                    })
                    .strength( d => d.__proto__.type ? 1 : 0.1)
                )
                .force("radial", null)
                .force("radial", d3.forceRadial()
                    .radius(d =>  d.__proto__.type ? 0 : settings.dims.width * 0.375 )
                    .x(centreline.x)
                    .y(centreline.y)
                    .strength(0.005)
                )
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(null) )

            // 2. Fixed node settings for non-project nodes (year labels and central node)
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = centreline.x
                vis.data.nodes[i].fy = oneQuarter.y
            })
            vis.data.nodes[data.list.years.length].fx = null
            vis.data.nodes[data.list.years.length].fy = null

            data.list.orgType.forEach((orgType, i) => {
                const index = data.list.years.length + i + 1,
                    clusterIDX =  clusterNames.indexOf(orgType)
                vis.data.nodes[index].fx = clusterPos[clusterIDX].x
                vis.data.nodes[index].fy = clusterPos[clusterIDX].y
            })
        },

        clusterFocus: (group = vis.state.layout.clusterGroup, clusterName = vis.state.layout.clusterFocus ) => { 
            // 0.  Set link and label visibility, and node scales
            vis.state.visibility.yearLabels = false
            vis.state.visibility.clusterLabels = false
            vis.state.visibility.centralClusterLabel = true
            vis.state.visibility.links = false
            vis.state.layout.nodeScale = 1
            vis.state.layout.lsNodeScale = 0.33
            vis.methods.layout.nodeResize()

            // 1. Set up the cluster node
            let searchKey
            switch(group){
                case 'tech':
                    searchKey = 'ctg_tech' ; break   
                case 'skills':
                    searchKey = 'ctg_skills' ; break   
                case 'roles':
                    searchKey = 'ctg_roles' ; break   
                case 'themes':
                    searchKey = 'ctg_themes' ; break  
                case 'thinking':
                    searchKey = 'ctg_thinking' ; break  
                case 'domains':
                    searchKey = 'ctg_domains' ; break  
                default:
            }

            d3.select('.cluster-node-label').text(clusterName)
                .call(helpers.wrap, settings.geometry.node.centralCluster * 1.5, 1.1)
                .style('opacity', 0)
                .transition().duration(250)
                .style('opacity', null)

            // 2.Set new simulation forces
            vis.state.simulation  =  d3.forceSimulation(vis.data.nodes)
                .force("charge", d3.forceManyBody().strength(d => d.__proto__.type  ? 0 : -500))
                .force("centre", d3.forceCenter(centreline.x, centreline.y).strength(0.1) )
                .force("collision", d3.forceCollide()
                    .radius( d => d.__proto__.type === 'cluster-inner' ?  settings.geometry.node.centralCluster
                        :  d.__proto__.type ?  0
                            : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) + settings.dims.width / 1080 * 5
                    )
                )
                .force("x", d3.forceX()
                    .x( d =>  d.__proto__.type === 'ls-node' ? centreline.x : null )
                    .strength(d =>  d.__proto__.type === 'ls-node' ? 1: null)
                )
                .force("y", d3.forceY()
                    .y( d => d.__proto__.type === 'ls-node' ? centreline.y - 150 : null)
                    .strength(d => d.__proto__.type === 'ls-node' ? 1: null)
                )
                .force("radial", d3.forceRadial()
                    .radius(d =>  d.__proto__.type ? 0 : 
                        (data.schema.projects[d.__proto__.id][searchKey].indexOf(clusterName) > -1) ? settings.geometry.node.centralCluster 
                        : settings.dims.width * 0.4 
                    )
                    .x(centreline.x)
                    .y(centreline.y)
                    .strength(1)
                )
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(null) )
                .velocityDecay(0.8)

            // 4. Fixed node settings for non-project nodes (year labels and central node)
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = centreline.x
                vis.data.nodes[i].fy = centreline.y
            })
            vis.data.nodes[data.list.years.length].fx = null
            vis.data.nodes[data.list.years.length].fy = null

            const noNonProjectNodes = data.list.years.length + 1 +  data.list.orgType.length
            vis.data.nodes[noNonProjectNodes].fx = centreline.x
            vis.data.nodes[noNonProjectNodes].fy = centreline.y

        },

        circle: () => {
            // 0.  Set link and label visibility, and node scales
            vis.state.visibility.yearLabels = false
            vis.state.visibility.clusterLabels = false
            vis.state.visibility.centralClusterLabel = false
            vis.state.visibility.links = false
            vis.state.layout.nodeScale = 1
            vis.state.layout.lsNodeScale = 1.25
            vis.methods.layout.nodeResize()

            // 1. Set new simulation forces for circular layout
            vis.state.simulation  =  d3.forceSimulation(vis.data.nodes)
                .force("charge", d3.forceManyBody().strength( d => d.__proto__.type  ? 0 : -100) )
                .force("centre", null )
                .force("collision", d3.forceCollide()
                    .radius( d =>   d.__proto__.type === 'ls-node' ? settings.geometry.node.centre  :  d.__proto__.type ? 0
                        : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) + (settings.dims.width / 1080 * 5) )
                )
                .force("radial", d3.forceRadial()
                    .radius(d =>  d.__proto__.type ? 0 : settings.dims.width * 0.25 )
                    .x(centreline.x)
                    .y(centreline.y)
                    .strength(1)
                )
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(0) )

            // 2. Fixed node settings for non-project nodes (year labels and central node) 
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = centreline.x
                vis.data.nodes[i].fy = centreline.y
            })
            vis.data.nodes[data.list.years.length].fx = centreline.x
            vis.data.nodes[data.list.years.length].fy = centreline.y
        },

        timelineX: () => { 
            // 0. Set link and label visibility, and node scales
            vis.state.visibility.yearLabels = true
            vis.state.visibility.clusterLabels = false
            vis.state.visibility.centralClusterLabel = false
            vis.state.visibility.links = false
            vis.state.layout.nodeScale = 1
            vis.state.layout.lsNodeScale = 1
            vis.methods.layout.nodeResize()

            // 1. Set new simulation forces for x-axis timeline layout
            vis.state.simulation  = d3.forceSimulation(vis.data.nodes)
                .force("charge", d3.forceManyBody().strength( d => d.__proto__.type ? 40 : 0) )
                .force("centre", null )
                .force("collision", d3.forceCollide().radius( d =>  d.__proto__.type === 'ls-node' ? settings.geometry.node.centre 
                    : d.__proto__.type === 'year-node' ? settings.dims.width / 1080 * 35
                        : d.__proto__.type ? 0
                            : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) + settings.dims.width / 1080 * 5 )
                )
                .force("x", d3.forceX().x( d => d.__proto__.type ? centreline.x:  d3.mean(data.schema.projects[d.__proto__.id].workObjects.map(d => vis.scales.timeX(d.date)) ) )
                    .strength(d => d.type ? 1: 0.45)
                )
                .force("y", d3.forceY().y( d => d.__proto__.type ? oneQuarter.y  : twoThird.y)
                    .strength(d => d.type ? 1 : 0.15)
                )
                .force("radial", null)
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(0) )

            // 2. Fixed node settings for non-project nodes (year labels and central node) and label visibility
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = vis.scales.timeX(new Date(year, 1, 1))
                vis.data.nodes[i].fy = twoThird.y
            })
            vis.data.nodes[data.list.years.length].fx = null
            vis.data.nodes[data.list.years.length].fy = null
        },

        timelineXY: () => { 
            // 0. Set link and label visibility, and node scales
            vis.state.visibility.yearLabels = true
            vis.state.visibility.clusterLabels = false
            vis.state.visibility.centralClusterLabel = false
            vis.state.visibility.links = false
            vis.state.layout.nodeScale = 1
            vis.state.layout.lsNodeScale = 1
            vis.methods.layout.nodeResize()

            // 1. Set new simulation forces for diagonal 'xy-axis' timeline layout
            vis.state.simulation  = d3.forceSimulation(vis.data.nodes)
                .force("charge", d3.forceManyBody().strength( d => d.__proto__.type ? 10 : 0) )
                .force("centre", null )
                .force("collision", d3.forceCollide()
                    .radius( d  => d.__proto__.type === 'ls-node' ? settings.geometry.node.centre 
                        : d.__proto__.type === 'year-node' ? settings.dims.width / 1080 * 35
                            : d.__proto__.type ? 0
                                : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) + (settings.dims.width / 1080 * 5)
                    )  
                )
                .force("x", d3.forceX()
                    .x( d => d.__proto__.type === 'year-node' ?  vis.scales.timeX(new Date(d.name, 1, 1))
                        : d.__proto__.type ? oneQuarter.x
                            : d3.mean( data.schema.projects[d.__proto__.id].workObjects.map(d => vis.scales.timeX(d.date)) ) 
                    )
                    .strength(d => d.__proto__.type === 'year-node' ? 0.25 : 1)
                )
                .force("y", d3.forceY()
                    .y( d =>  d.__proto__.type === 'year-node'? vis.scales.timeY(new Date(d.name, 1, 1))
                        : d.__proto__.type ? oneQuarter.y  
                            : d3.mean( data.schema.projects[d.__proto__.id].workObjects.map(d => vis.scales.timeY(d.date)) )
                    )
                    .strength(d => d.__proto__.type === 'year-node' ? 0.25 : 0.2)
                )
                .force("radial", null)
                .force("radial", null)
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(null) )
                .velocityDecay(0.5 )

            // 2. Fixed node settings for non-project nodes (year labels and central node)
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = vis.scales.timeX(new Date(year, 1, 1))
                vis.data.nodes[i].fy = vis.scales.timeY(new Date(year, 1, 1))
            })
            vis.data.nodes[data.list.years.length].fx = null
            vis.data.nodes[data.list.years.length].fy = null
        },

        timelineSpiral: () => {
            // 0.  Set link and label visibility, and node scales
            vis.state.visibility.yearLabels = true
            vis.state.visibility.clusterLabels = false
            vis.state.visibility.centralClusterLabel = false
            vis.state.visibility.links = true
            vis.state.layout.nodeScale = 0.65
            vis.state.layout.lsNodeScale = 0.5
            vis.methods.layout.nodeResize()

            // 1. Set up spiral path  >> Adapted from > https://observablehq.com/@emepyc/spiral-subsections#points
                // a. Spiral data, scales and line generator
                const startYear     = d3.min(data.list.dates).getFullYear() ,
                    endYear         = d3.max(data.list.dates).getFullYear() + 1,
                    spiralYears     = Array.from(Array(endYear - startYear + 1).keys()).map( d => new Date(d + startYear, 0, 1)),
                    spiralTimescale = d3.scaleTime().domain(spiralYears)

                const start = 0, end = 2,
                    numSpirals = spiralYears.length - 1,
                    r = vis.scales.timeRadial.range()[1],
                    theta = (r) => numSpirals * Math.PI * r + Math.PI,
                    pointsCalc = (start, end) =>  d3.range(start, end + 0.001, (end - start) / 1000),                
                    points = pointsCalc(start, end),
                    spiralRadius = d3.scaleLinear()
                        .domain([start, end])
                        .range(vis.scales.timeRadial.range()),
                    spiral = d3.lineRadial()
                        .curve(d3.curveCardinal)
                        .angle(theta)
                        .radius(spiralRadius) ,
                    spiralPathCoords = spiral(points)

                // b. Add full spiral path
                const spiralGroup = chartArea.append('g').classed('gridline', true)
                    .attr('transform', `translate(${width * 0.5}, ${height * 0.5})`)        
                    .append('path')
                    .classed('gridline spiral', true)
                    .attr('d', spiralPathCoords)

                // c. Setup spiral scale for "one turn per year" using separate segments for each turn, and then recording their length
                const spiralPath = document.querySelector('.gridline.spiral'),
                    spiralPathLength = spiralPath.getTotalLength(),
                    turnGap = (vis.scales.timeRadial.range()[1] - vis.scales.timeRadial.range()[0]) / numSpirals

                const spiralTurnLengths = spiralYears.map((yearDate, i) => {
                    const theta = (r) => 1 * Math.PI * r + Math.PI,
                        spiralRadius  = d3.scaleLinear()
                            .domain([start, end])
                            .range([vis.scales.timeRadial.range()[0] + (i * turnGap) , vis.scales.timeRadial.range()[0] + ((i+1) * turnGap)]),
                        spiral = d3.lineRadial()
                            .curve(d3.curveCardinal)
                            .angle(theta)
                            .radius(spiralRadius) 

                    const spiralSector = chartArea.append('g').attr('transform', `translate(${width * 0.5}, ${height * 0.5})`) 
                            .append('path')
                            .classed('gridline dummy', true)
                            .style('stroke', i === 0 ? 'red' : 'blue').style('stroke-width',  i === 0 ? 5 : 0)
                            .attr('d', spiral(points))

                    return spiralSector.node().getTotalLength()
                })

                d3.selectAll('.dummy').remove()                             // Remove dummy paths
                spiralTurnLengths.unshift(0)                                // Add an  zero length for initial year
                const spiralPathLengths = d3.cumsum(spiralTurnLengths)      // Get array of cumulative lengths
                spiralTimescale.range(spiralPathLengths)                    // And use to set up spiralTimescale 

            // 2. Simulation settings for nodes on timeline spiral
            vis.state.simulation  =  d3.forceSimulation(vis.data.nodes)
                .force("charge", null)      
                .force("centre", null )          
                .force("collision", d3.forceCollide()
                    .radius( d  => d.__proto__.type === 'ls-node' ? settings.geometry.node.centre 
                        : d.__proto__.type === 'year-node' ? settings.dims.width / 1080 * 35 
                            :  d.__proto__.type  ? 0
                                : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) + (settings.dims.width / 1080 * 5)
                    )  
                )
                .force("x", d3.forceX()
                    .x( d => d.__proto__.type ?  centreline.x : spiralPath.getPointAtLength( d3.mean(data.schema.projects[d.__proto__.id].workObjects.map(d => spiralTimescale(d.date))) ).x + centreline.x)
                    .strength(d => d.__proto__.type ? 5 : 0.5)
                )
                .force("y", d3.forceY()
                    .y( (d, i) => d.__proto__.type ?  centreline.y : spiralPath.getPointAtLength( d3.mean(data.schema.projects[d.__proto__.id].workObjects.map(d => spiralTimescale(d.date))) ).y + centreline.y)
                    .strength(d => d.__proto__.type ? 5 : 0.5)
                )
                .force("radial", null)
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(null) )
                .velocityDecay(0.7)

            // 3. Fixed node settings for non-project nodes (year labels and central node)
            spiralYears.forEach( (date, i) => {
                vis.data.nodes[i].fx = spiralPath.getPointAtLength(spiralTimescale(date)).x + centreline.x
                vis.data.nodes[i].fy = spiralPath.getPointAtLength(spiralTimescale(date)).y + centreline.y
            })
            vis.data.nodes[data.list.years.length].fx = null
            vis.data.nodes[data.list.years.length].fy = null
        },

        constellationRadial: () => {
            // 0.  Set link and label visibility, and node scales
            vis.state.visibility.yearLabels = true
            vis.state.visibility.clusterLabels = false
            vis.state.visibility.centralClusterLabel = false
            vis.state.visibility.links = true
            vis.state.layout.nodeScale = 0.8
            vis.state.layout.lsNodeScale = 0.5
            vis.methods.layout.nodeResize()

            // 1. Set new simulation forces for the radial constellation layout
            vis.state.simulation  =  d3.forceSimulation(vis.data.nodes)
                .force("charge", d3.forceManyBody().strength( (d, i) => d.type  ? vis.scales.valueCharge(settings.geometry.node.centre) : -100) )
                .force("centre", d3.forceCenter(centreline.x, centreline.y) )
                .force("collision", d3.forceCollide()
                    .radius( d  => d.__proto__.type === 'ls-node' ? settings.geometry.node.centre 
                        : d.__proto__.type === 'year-node' ? settings.dims.width / 1080 * 35
                            :  d.__proto__.type ? 0
                                : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) + (settings.dims.width / 1080 * 5)
                    )  
                )
                .force("x", null)
                .force("y", null)
                .force("radial", d3.forceRadial()
                    .radius((d, i) =>  d.type ? 0  : d3.mean(data.schema.projects[d.__proto__.id].workObjects.map(d => vis.scales.timeRadial(d.date))) )
                    .x(centreline.x)
                    .y(centreline.y)
                    .strength(d => d.type  !== 'year-node' ? 1 : 1000)
                )
                .force("link", d3.forceLink(vis.data.links)
                    .id(d => d.id)
                    .strength(0.2)
                )
                .velocityDecay(0.7)
        
            // 2. Fixed node settings for non-project nodes (year labels and central node) and gridlines
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = centreline.x
                vis.data.nodes[i].fy = centreline.y + vis.scales.timeRadial(new Date(year, 6, 30))

                chartArea.append('circle')
                    .classed('gridline radial-year', true)
                    .attr('r', vis.scales.timeRadial(new Date(year, 1, 1)))
                    .attr('cx', width * 0.5)
                    .attr('cy', height * 0.5)
            })
        },

        constellationHorizon: (type = vis.state.layout.ratingName) => {
            // 0.  Set link and label visibility, and node scales
            vis.state.visibility.yearLabels = true
            vis.state.visibility.clusterLabels = false
            vis.state.visibility.centralClusterLabel = false
            vis.state.visibility.links = true
            vis.state.layout.nodeScale = 0.8
            vis.state.layout.lsNodeScale = 1
            vis.methods.layout.nodeResize()

            // 1. Set scales and value indicator
            let ratingScale, ratingName
            switch(type){
                case 'fun':
                    ratingScale = vis.scales.rtgFunY
                    ratingName = 'rtg_fun'
                    break
                case 'fame':
                    ratingScale = vis.scales.rtgFameY
                    ratingName = 'rtg_fame'
                    break   
                case 'fortune':
                    ratingScale = vis.scales.rtgFortuneY
                    ratingName = 'rtg_fortune'
                    break
                case 'average':
                default:
                    ratingScale = vis.scales.rtgAveY
                    ratingName = 'rtg_ave'
            }

            // 2. Set new simulation forces for horizon constellation layout
            vis.state.simulation  = d3.forceSimulation(vis.data.nodes)
                .force("charge", d3.forceManyBody().strength( (d, i) => d.__proto__.type ? 10 : 06) )
                .force("centreline", null)
                .force("collision", d3.forceCollide()
                    .radius( (d, i) =>  d.__proto__.type === 'ls-node' ? settings.geometry.node.centre 
                        : d.__proto__.type ?  0 
                            : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) * 1.5 
                    )
                )
                .force("x", d3.forceX().x( d => d.__proto__.type ? centreline.x :  d3.mean(data.schema.projects[d.__proto__.id].workObjects.map(d => vis.scales.timeX(d.date)) ) )
                    .strength(d => d.__proto__.type ? 1: 0.5)
                )
                .force("y", d3.forceY().y( d =>  d.__proto__.type ? settings.dims.height * 0.175   :  ratingScale(data.schema.projects[d.__proto__.id][ratingName] )  )
                    .strength(d => d.__proto__.type ? 1: 0.5)
                )
                .force("radial", null)
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(0) )

            // 2. Fixed node settings for non-project nodes (year labels and central node) and gridlines
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = vis.scales.timeX(new Date(year, 1, 1))
                vis.data.nodes[i].fy = settings.dims.height - settings.dims.margin.bottom
            })
            vis.data.nodes[data.list.years.length].fx = null
            vis.data.nodes[data.list.years.length].fy = null
        }
    }

    ///////////////////////////////////
    ////   RENDER LINKS AND NODES  ////
    ///////////////////////////////////

    // a. Links (as straight lines)
    vis.els.link = vis.els.svg.append("g").classed('link-group', true)
        .selectAll("line")
        .data(vis.data.links)
            .join("line")
            .attr('class', d => `project-link ${d.__proto__.source} ${d.__proto__.target} ${d.__proto__.class ? d.__proto__.class : ''}`)
            .attr("stroke-width", d => vis.scales.valueThickness(data.schema.projects[d.__proto__.target].value_LS) )

    // b. Add nodes 
    vis.els.node = vis.els.svg.append("g").classed('node-group', true)
        .selectAll("g")
        .data(vis.data.nodes)
            .join("g")
            .attr('class', (d,i) => d.type ? `${d.type}-group` : `project-group ${d.__proto__.id}`)

        // i. Project and year nodes with shape options
            // I. Partners transparent 'shadow bg' (fee based projects only)
            vis.els.node.append('path')
                .attr('class', d => typeof d.__proto__.type !== 'undefined' || data.schema.projects[d.__proto__.id].project_type  === 'pro bono' || data.schema.projects[d.__proto__.id].project_type  === "lab" ? 'dummy' : 'project-value-bg')
                .attr("d", d => typeof d.__proto__.type !== 'undefined' ? null : helpers.circlePath(vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS + d3.sum(data.schema.projects[d.__proto__.id].value_partners)) )   
                )

            // II. Node background (used to cover links where mix-blend mode is applied)
            if(settings.layout.nodeExtras){
                vis.els.node.append('path')
                    .attr('class', d => typeof d.__proto__.type !== 'undefined'  ? 'dummy' : `node-bg ${helpers.slugify(data.schema.projects[d.__proto__.id].project_type)}`)
                    .attr("d", d =>  typeof d.__proto__.type !== 'undefined'  ? null 
                            : data.schema.projects[d.__proto__.id].project_type === "pro bono" ? settings.geometry.icon.heart
                            : data.schema.projects[d.__proto__.id].project_type === "lab" ? settings.geometry.icon.beaker
                            : helpers.circlePath(vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) ) 
                    )
                    .attr('transform', d =>  typeof d.__proto__.type === 'undefined' &&  (d.__proto__.project_type === "pro bono" ||  d.__proto__.project_type === "lab") 
                        ? `scale(${vis.scales.valueRadius(data.schema.projects[d.__proto__.id].value_LS) } )` : null)
            }

            // III. Node shape
            vis.els.node.append("path")
                .on('mouseover', nodeMouseover)
                .on('mouseout', nodeMouseout)  
                .attr('class', d => {
                    const clientObj = data.schema.orgs[d.__proto__.client]
                    return d.__proto__.type ? 'dummy' : `project-node ${d.__proto__.id} ${helpers.slugify(clientObj.type)} ${helpers.slugify(clientObj.subtype)} ${helpers.slugify(data.schema.projects[d.__proto__.id].project_type)}` 
                })
                .attr("stroke-width", d => settings.layout.nodeExtras ? null : d.type ?  0   
                    : typeof d.__proto__.type === 'undefined' && (d.__proto__.project_type === "pro bono" ||  d.__proto__.project_type === "lab")  
                    ? 1 / vis.scales.valueRadius(data.schema.projects[d.__proto__.id].value_LS)
                        : vis.scales.valueThickness(data.schema.projects[d.__proto__.id].value_LS) )
                .attr("d", d => typeof d.__proto__.type !== 'undefined' ? null 
                        : data.schema.projects[d.__proto__.id].project_type === "pro bono" ? settings.geometry.icon.heart
                        : data.schema.projects[d.__proto__.id].project_type === "lab" ? settings.geometry.icon.beaker
                        : helpers.circlePath(vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) ) 
                )
                .attr('transform', d =>  typeof d.__proto__.type === 'undefined' && (d.__proto__.project_type === "pro bono" ||  d.__proto__.project_type === "lab")  
                        ? `scale(${vis.scales.valueRadius(data.schema.projects[d.__proto__.id].value_LS)})`  : null)

            //  IV. Node outline (used for effects)
            if(settings.layout.nodeExtras){
                vis.els.node.append("path")
                    .attr('class', d =>  d.__proto__.type ? 'dummy' : `project-node-outline ${helpers.slugify(data.schema.projects[d.__proto__.id].project_type)}`)
                    .attr("stroke-width", d => d.type ?  0   
                        : typeof d.__proto__.type === 'undefined' && (d.__proto__.project_type === "pro bono" ||  d.__proto__.project_type === "lab")  
                        ? 1 / vis.scales.valueRadius(data.schema.projects[d.__proto__.id].value_LS)
                            : vis.scales.valueThickness(data.schema.projects[d.__proto__.id].value_LS) )
                    .attr("d", d =>  d.__proto__.type ? null     
                            : data.schema.projects[d.__proto__.id].project_type === "pro bono" ? settings.geometry.icon.heart
                            : data.schema.projects[d.__proto__.id].project_type === "lab" ? settings.geometry.icon.beaker
                            : helpers.circlePath(vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) ) 
                    )
                    .attr('transform', d =>  typeof d.__proto__.type === 'undefined' && (d.__proto__.project_type === "pro bono" ||  d.__proto__.project_type === "lab")  
                        ? `scale(${vis.scales.valueRadius(data.schema.projects[d.__proto__.id].value_LS) } )` : null  )
            }

            // V. Remove unused
            d3.selectAll('.dummy').remove()
    

        // ii. Add centered LS node with label
        const lsNode = d3.select('.ls-node-group').append('g')
            .classed('ls-node-icon-container', true)
            .on('mouseover', lsNodeMouseover)
            .on('mouseout', nodeMouseout)

        lsNode.append('path').classed('ls-node', true).attr('d', settings.geometry.icon.heart750)
        lsNode.append('text').classed('ls-node-label', true).attr('y', -20).text('Little')
        lsNode.append('text').classed('ls-node-label', true).attr('y', 10).text('Sketches')

        // iii. Add year node group
        d3.selectAll('.year-node-group')
            .append('text').classed('year-node-label', true)
            .attr('y', 5)
            .text(d => d.__proto__.name)
            
        // iv. Add org type cluster nodes
        d3.selectAll('.orgType-node-group')
            .append('text').classed('orgType-node-label', true)
            .attr('y', 5).attr('dy', 0)
            .attr('x', 0)
            .text(d => d.__proto__.name)
            .call(helpers.wrap, settings.geometry.node.cluster, 1.2)

        // v. Add inner cluster node
        const innerClusterNode = d3.select('.inner-cluster-node-group')
        innerClusterNode
            .append('circle').classed('cluster-outline', true)
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r',  settings.geometry.node.centralCluster)

        innerClusterNode.append('text')
            .classed('cluster-node-label', true)
            .attr('y', 5).attr('dy', 0)
            .attr('x', 0)

    /////////////////////////////
    ////  START SIMULATION   ////
    /////////////////////////////

    vis.methods.ui.updateSimLayout(vis.state.sim.name)


    ////////////////////////////
    ////  VIS INTERACTIONS  ////
    ////////////////////////////

    const tooltip = d3.select("#tooltip") 

    // PROJECT NODES
    function nodeMouseover(event, d){
        // 1. Tooltip

        const bbox = this.getBoundingClientRect()
            x = bbox.x, 
            y = bbox.y
        let projectID

        if(typeof d.__proto__.id !== 'undefined'){
            projectID = d.__proto__.id
            const projectData = data.schema.projects[projectID],
                projectShortDesc = projectData.activeName ? `${projectData.activeName}.`: '', 
                clientData = data.schema.orgs[projectData.client],
                nodeRadius = vis.scales.valueRadius(projectData.value_LS),
                dates = projectData.workObjects,
                fees = projectData.value_LS,
                lsProjectSize = fees < 5000 ? ' little' : fees < 10000 ? ' small' : '',
                partnerFees =  d3.sum(projectData.value_partners),
                projectValue = fees + partnerFees

            let feeSizeDescription
            for(let i = 0; i < vis.scales.bins.fees.length; i++){ 
                if(fees < vis.scales.bins.fees[i].x1){
                    feeSizeDescription = vis.scales.feeSize(i); break
                } else {
                    feeSizeDescription = vis.scales.feeSize(vis.scales.bins.fees.length)
                }
            }

            let dateString = `A${lsProjectSize} project `
            if(dates.length === 1){
                dateString += `delivered circa ${d3.timeFormat('%B %Y')(dates[0].date)}`
            } else{
                const fromDate = dates[0].date, fromYear = fromDate.getFullYear(), fromMonth = fromDate.getMonth(),
                    toDate = dates[dates.length - 1].date, toYear = toDate.getFullYear(), toMonth = toDate.getMonth()
                if(fromYear === toYear && fromMonth === toMonth){
                    dateString += `delivered circa ${d3.timeFormat('%B %Y')(dates[0].date)}`
                } else if (fromYear === toYear){
                    dateString += ` delivered circa ${d3.timeFormat('%B ')(dates[0].date)} to ${d3.timeFormat('%b %Y')(dates[dates.length - 1].date)}`
                } else {
                    dateString += ` delivered circa ${d3.timeFormat('%B %Y')(dates[0].date)} to ${d3.timeFormat('%b %Y')(dates[dates.length - 1].date)}`
                }
            }

            let deliveryOrgString = ''
            if(projectData.org_lead !== 'Little Sketches'){
                let lead = [`${projectData.org_lead} (lead)`],
                    partnersExLead = projectData.org_partners.filter(d => d !== projectData.org_lead),
                    partnerArray = lead.concat(partnersExLead),
                    partnerStrings = partnerArray.map((d, i) => i=== 0 ? d : i === partnerArray.length - 1 ? ` and ${d}` : `, ${d}`)
                deliveryOrgString = `, with ${partnerStrings.join('')}`
            } else {
                deliveryOrgString = '.'
            }

            document.getElementById('tooltip-client').innerHTML = projectData.client
            document.getElementById('tooltip-header').innerHTML = projectData.name 
            document.getElementById('tooltip-description').innerHTML = `${projectShortDesc} ${dateString}${deliveryOrgString}`

            tooltip.classed(helpers.slugify(clientData.type), true)
                .style('opacity' , 1)
                .style('left', `${bbox.x + bbox.width * 0.5 - tooltip.node().offsetWidth * 0.5}px`)
                .style('top', `${bbox.y - tooltip.node().offsetHeight - 5}px`)
        }

        // 2. Highlight the connected network
        d3.select(this).classed('no-mix-blend', true)       // Network node colours

        let selectedNodeData = this.__data__.__proto__,
            nodeID = selectedNodeData.id,
            projectData = data.schema.projects[nodeID]
        
        // a. Traverse up the parents to the 'master'
        if(projectData.network_parents.length > 0){
            do {
                nodeID = projectData.network_parents[0]
                projectData = data.schema.projects[nodeID]         
            } while( projectData.network_parents.length > 0)
        }

        // b. Traverse from 'master' parent down through all children
        const childID_array =  [nodeID].concat(projectData.network_children)            
        for(id of childID_array){
            projectData = data.schema.projects[id]
            if(projectData.network_children.length > 0){
                const childIDs = projectData.network_children
                for(id of childIDs){
                    childID_array.push(id)
                } 
            }
        }
        // c. Style the connected network
        const networkClassString = [...new Set(childID_array)].map(d => `.${d}`).toString()
        d3.selectAll(networkClassString).classed('no-mix-blend', true).style('opacity', null)
        d3.selectAll(`.project-group:not(${networkClassString})`).style('opacity', 0.1)
        d3.selectAll(`.project-link:not(${networkClassString})`).style('opacity', 0)
        d3.selectAll(`.project-link:not(${networkClassString})`).style('opacity', 0)

    }; // end nodeMouseover()

    function nodeMouseout(){
        tooltip.style('opacity' , 0).attr('class', 'tooltip')
        d3.selectAll('.project-node').classed('no-mix-blend', false).style('opacity', null)
        d3.selectAll('.project-group').style('opacity', null)
        d3.selectAll('.project-link').style('opacity', vis.state.visibility.links ? null : 0)
    }; // // end nodeMouseout()

    // LS NODE
    function lsNodeMouseover(){
        d3.selectAll('.project-node').classed('no-mix-blend', true).style('opacity', null)
        d3.selectAll('.project-link').style('opacity', null)
    }; // end lsNodeMouseover()


    // Key press views
    document.addEventListener("keypress",  async (event) =>{ 
        // console.log(event.keyCode)
        switch(event.keyCode){

            case 48:  // 0
                vis.methods.ui.updateSimLayout('circle')
                break
            case 49: // 1
                vis.methods.ui.updateSimLayout('clusterHuddle')
                break   
            case 50: // 2
                vis.methods.ui.updateSimLayout('timelineX')
                break    
            case 51: // 3
                vis.methods.ui.updateSimLayout('timelineXY')
                break   
            case 52: // 4
                vis.methods.ui.updateSimLayout('timelineSpiral')
                break    
            case 53: // 5
                vis.methods.ui.updateSimLayout('constellationRadial')
                break   
            case 54: // 6
                vis.methods.ui.updateSimLayout('clusterMultiFoci')
                break   
            case 55: // 7
                // vis.state.layout.clusterFocus = data.list.project[vis.state.layout.clusterGroup][0]
                const index = data.list.project[vis.state.layout.clusterGroup].indexOf(vis.state.layout.clusterFocus)

                vis.methods.ui.updateSimLayout('clusterFocus')
                vis.state.layout.clusterFocus = data.list.project[vis.state.layout.clusterGroup][(index +1) % data.list.project[vis.state.layout.clusterGroup].length]
                break    
            case 114: // r
                const clusterGroups = ['tech', 'skills', 'roles', 'themes', 'thinking', 'domains'],
                    clusterIDX = clusterGroups.indexOf(vis.state.layout.clusterGroup)
                vis.state.layout.clusterGroup = clusterGroups[(clusterIDX + 1) % clusterGroups.length]
                vis.state.layout.clusterFocus = data.list.project[vis.state.layout.clusterGroup][0]
                console.log('Cluster group is: '+vis.state.layout.clusterGroup)
                break    
            case 56: // 8
                vis.state.layout.ratingName = 'average'
                vis.methods.ui.updateSimLayout('constellationHorizon')
                break  

            case 101: // e
                console.log('*** FUN ***')
                vis.state.layout.ratingName = 'fun'
                vis.methods.ui.updateSimLayout('constellationHorizon')
                break    
            case 119: // w
                console.log('*** FORTUNE ***')
                vis.state.layout.ratingName = 'fortune'
                vis.methods.ui.updateSimLayout('constellationHorizon')
                break    
            case 113: // q
                console.log('*** FAME ***')
                vis.state.layout.ratingName = 'fame'
                vis.methods.ui.updateSimLayout('constellationHorizon')
                break    

        }
    });


    function setClusterPositions(){
        settings.clusters = {
            orgType: {
                0: { //'Community'
                    x:  centreline.x,
                    y:  oneQuarter.y / 2
                },
                1: { //'Education and research'
                    x:  centreline.x,
                    y:  threeQuarter.y + oneQuarter.y /2
                },
                2: { // 'Non-government organisation' 
                    x:  oneQuarter.x,
                    y:  oneThird.y
                },
                3: { //  'Non-for-profit'
                    x:  threeQuarter.x,
                    y:  oneThird.y
                },
                4: { // Private sector
                    x:  threeQuarter.x,
                    y:  twoThird.y
                },
                5: { // Public sector
                    x:  oneQuarter.x,
                    y:  twoThird.y
                }
            }
        }
    };

};
