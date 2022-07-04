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
            centralLinks:       'root-only',
            roundValue:         true
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
                ctg_themes:         "> Little big themes",
                ctg_tech:           "> Tools and technologies",
                ctg_skills:         "> Capabilities",
                ctg_domains:        "> Domains",
            }
        },
        scene: {}
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
            mode:                       'dark',
            isTouchScreen:              () => (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)),
            visibility: {
                links:                  '',
                yearLabels:             '',
                clusterLabels:          '',
                centralClusterLabel:    '',
                lsLabel:                true,
                clusterSelector:        false,
                // Filter effects
                sketch:                 false,
                glow:                   true,
            },   
            layout: {
                nodeScale:      1,
                lsNodeScale:    1,
                ratingName:     'average',
                clusterType:    'orgType',
                clusterGroup:   'themes',
                clusterFocus:   'Tap here',
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
                    d3.selectAll('.ls-node-label').transition().duration(500).style('opacity', vis.state.visibility.lsLabel ? null : 0)
                    d3.select('.cluster-menu').transition().duration(500).style('opacity', vis.state.visibility.clusterSelector ? null : 0)
                    d3.selectAll('.cluster-item').style('pointer-events', vis.state.visibility.clusterSelector ? null : 'none'),
                    vis.els.lsNode.on('click', name === 'clusterFocus' ? vis.methods.ui.lsNodeClick : null)
                    d3.selectAll('.project-node').on('click', name === 'radialMoon' ? vis.methods.ui.projectNodeClick : null)

                    vis.methods.layout.nodeResize()

                    // X. Tick handlers
                    function onTick(){
                        vis.els.link.attr("x1", d => d.source.x)
                            .attr("y1", d => d.source.y)
                            .attr("x2", d => d.target.x)
                            .attr("y2", d => d.target.y);

                        vis.els.node.attr("transform", d => {
                            const projectType = typeof d.__proto__.type ==='undefined' ? data.schema.projects[d.__proto__.id].project_type : null
                            const lightPos = {x: vis.els.lsNode.node().__data__.x, y: vis.els.lsNode.node().__data__.y}
                            return (projectType === 'consulting' || projectType === 'residency') 
                                ?`translate(${d.x}, ${d.y}) rotate(${-45 + helpers.angle(lightPos, {x: d.x, y: d.y})})`: `translate(${d.x}, ${d.y})` 
                        })
                    };
                    function onEnd(){
                    };
                }, // end updateSimLayout()

                changeSim: (next = true) => {
                    const currentIndex = settings.scene.simOrder.map(d => d.name).indexOf(vis.state.sim.name)
                    let nextSimIndex, nextSim
                    switch(next){
                        case true:
                                nextSimIndex = (currentIndex + 1) % settings.scene.simOrder.length
                            break
                        case false: 
                                nextSimIndex = currentIndex === 0 ? settings.scene.simOrder.length - 1 : currentIndex - 1
                            break       
                        default:
                    }

                    vis.methods.ui.updateSimLayout(settings.scene.simOrder[nextSimIndex].name)
                    vis.methods.ui.updateAnnotation()
                }, // end changeSim()

                updateAnnotation: (simName = vis.state.sim.name) => {
                    const data = settings.scene.simOrder.filter(d => d.name === vis.state.sim.name)[0]
                    d3.select('.title-container').style('opacity', null)
                    vis.els.annotation.transition().duration(1000)
                        .attr('transform', `translate(${data.posX}, ${data.posY})`)

                    vis.els.annotation.select('text').transition().duration(500).style('opacity', 0)
                    d3.select('.title').transition().duration(500).style('opacity', 0)

                    setTimeout(() => {
                        vis.els.annotation.select('text')
                            .style('text-anchor', data.textAnchor)
                            .text(data.annotation)
                            .call( helpers.wrap, data.wrapWidth, 1.25, true)
                            .transition().duration(500).style('opacity', null)     

                        d3.select('.title')
                            .html(data.title)
                            .transition().duration(500).style('opacity', null)
                    }, 500);
                }, // end updateAnnotation

                highlightNetwork: (nodeID) =>{
                    let  projectData = data.schema.projects[nodeID],
                        masterNodeID = nodeID
                    // a. Traverse up the parents to the 'master'
                    if(projectData.network_parents.length > 0){
                        do {
                            masterNodeID = projectData.network_parents[0]
                            projectData = data.schema.projects[masterNodeID]         
                        } while( projectData.network_parents.length > 0)
                    }

                    // b. Traverse from 'master' parent down through all children
                    const childID_array =  [masterNodeID].concat(projectData.network_children)            
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
                    d3.selectAll(`${networkClassString}:not(.${nodeID})`).style('opacity', null).classed('mute', true)
                    d3.selectAll(`.${nodeID}`).classed('mute', false)
                    d3.selectAll(`.project-group:not(${networkClassString})`).style('opacity', 0.1)
                    d3.selectAll(`.project-link:not(${networkClassString})`).style('opacity', 0)
                },  // end highlightNetwork()

                showTooltip: (thisNode, d) => {
                    const tooltip = d3.select("#tooltip"), 
                        nodeBBox = thisNode.getBoundingClientRect(),
                        projectID = d.__proto__.id,
                        projectData = data.schema.projects[projectID],
                        projectShortDesc = projectData.activeName ? `${projectData.activeName}.`: '', 
                        clientData = data.schema.orgs[projectData.client],
                        nodeRadius = vis.scales.valueRadius(projectData.value_LS),
                        dates = projectData.workObjects,
                        fees = projectData.value_LS,
                        estDeliveryMonths = fees / 15000,
                        lsProjectSize = fees < 5000 ? ' little' : fees < 10000 ? ' small' : '',
                        partnerFees =  d3.sum(projectData.value_partners),
                        projectValue = fees + partnerFees,
                        projectAdjStem = projectData.project_adjective ?  ['a', 'e', 'i', 'o', 'u'].indexOf(projectData.project_adjective.slice(0,1).toLowerCase()) > -1 ? `An ${projectData.project_adjective}` :  `A ${projectData.project_adjective}` : 'A',
                        projectTypeStem = projectData.project_type === 'residency' ? `${projectData.project_type} undertaken` : projectData.project_type === 'lab' ? `${projectData.project_type} project brought to life` : `${projectData.project_type} project delivered` 
                    
                    // A. Tooltip info 
                    let feeSizeDescription
                    for(let i = 0; i < vis.scales.bins.fees.length; i++){ 
                        if(fees < vis.scales.bins.fees[i].x1){
                            feeSizeDescription = vis.scales.feeSize(i); break
                        } else {
                            feeSizeDescription = vis.scales.feeSize(vis.scales.bins.fees.length)
                        }
                    }

                    let dateString = `${projectAdjStem} ${projectTypeStem} `
                    if(dates.length === 1){
                        dateString += `around ${d3.timeFormat('%B %Y')(dates[0].date)}`
                    } else{
                        const fromDate = dates[0].date, fromYear = fromDate.getFullYear(), fromMonth = fromDate.getMonth(),
                            toDate = dates[dates.length - 1].date, toYear = toDate.getFullYear(), toMonth = toDate.getMonth()
                        if(fromYear === toYear && fromMonth === toMonth){
                            dateString += `around ${d3.timeFormat('%B %Y')(dates[0].date)}`
                        } else if (fromYear === toYear){
                            dateString += `around ${d3.timeFormat('%b ')(dates[0].date)} to ${d3.timeFormat('%b %Y')(dates[dates.length - 1].date)}`
                        } else {
                            dateString += `around ${d3.timeFormat('%b %Y')(dates[0].date)} to ${d3.timeFormat('%b %Y')(dates[dates.length - 1].date)}`
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

                    // B. Tooltip positioning and visisibitty 
                    const toolTipWidth    = tooltip.node().offsetWidth,
                        toolTipHeight   = tooltip.node().offsetHeight

                    let toolTipTop      = nodeBBox.y - toolTipHeight - 5,
                        toolTipLeft     = nodeBBox.x + nodeBBox.width * 0.5 - tooltip.node().offsetWidth * 0.5,
                        toolTipRight    = nodeBBox.x + nodeBBox.width * 0.5 + tooltip.node().offsetWidth * 0.5

                    if(nodeBBox.y - toolTipHeight < 0){
                        toolTipTop = nodeBBox.y + nodeBBox.height + 5
                    }
                    if(toolTipLeft < 0){ 
                        toolTipTop  = nodeBBox.y + nodeBBox.height * 0.5 - toolTipHeight * 0.5
                        toolTipLeft = nodeBBox.x + nodeBBox.width + 5
                    }
                    if(window.innerWidth - toolTipRight < 0){
                        toolTipTop  = nodeBBox.y + nodeBBox.height * 0.5 - toolTipHeight * 0.5
                        toolTipLeft = nodeBBox.x  - 5 - toolTipWidth 
                    }

                    tooltip.classed(helpers.slugify(clientData.type), true)
                        .style('opacity' , 1)
                        .style('left', `${toolTipLeft}px`)
                        .style('top', `${toolTipTop}px`)
                }, // end showTipTool()

                lsNodeMouseover: () => {
                    d3.selectAll('.project-link').style('opacity', null)
                }, // end lsNodeMouseover()

                lsNodeClick: () => {
                    // Update cluster focus
                    if(vis.state.sim.name === 'clusterFocus'){
                        let index = data.list.project[vis.state.layout.clusterGroup].indexOf(vis.state.layout.clusterFocus)
                        if(index === -1){
                            vis.state.layout.clusterFocus = data.list.project[vis.state.layout.clusterGroup][0],
                            index = 0
                        }

                        vis.methods.ui.updateSimLayout('clusterFocus')
                        vis.state.layout.clusterFocus = data.list.project[vis.state.layout.clusterGroup][(index +1) % data.list.project[vis.state.layout.clusterGroup].length]
                    }
                }, // lsNodeClick

                nodeMouseover: function(event, d){
                    // 1. Tooltip for project nodes
                    if(typeof d.__proto__.id !== 'undefined') vis.methods.ui.showTooltip(this, d) 
                    // 2. Highlight the connected network
                    const selectedNodeData = this.__data__.__proto__,
                        nodeID = selectedNodeData.id

                    vis.methods.ui.highlightNetwork(nodeID)
                }, // end nodeMouseover()

                nodeMouseout: () => {
                    d3.select("#tooltip").style('opacity' , 0).attr('class', 'tooltip')
                    d3.selectAll('.project-node').style('opacity', null).classed('mute', false).classed('highlight', false)
                    d3.selectAll('.project-group').style('opacity', null)
                    d3.selectAll('.project-link').style('opacity', vis.state.visibility.links ? null : 0)
                }, //  end nodeMouseout()

                updateProjectModal: (nodeID) => {
                    const infoContainer = d3.select('.project-info-container'),
                        imagesContainer =    d3.select('.project-images-group'),  
                        projectData = data.schema.projects[nodeID],
                        clientData = data.schema.orgs[projectData.client],
                        dates = projectData.workObjects,
                        fees = projectData.value_LS,
                        lsProjectSize = fees < 5000 ? ' little' : fees < 10000 ? ' small' : '',
                        partnerFees =  d3.sum(projectData.value_partners),
                        projectValue = fees + partnerFees

                    // 1. Title and subtitle
                    d3.select('.project-title').html(projectData.name)
                    d3.select('.project-subtitle').html(projectData.activeName)
                    if(projectData.description){
                        d3.select('.project-description-container').html(`
                                <div class="project-details-label about">About the project</div>
                                ${projectData.description}
                        `)
                    } else {
                        d3.select('.project-description-container').html('')
                    }

                    // 2a. Clear the project container 
                     d3.selectAll('.project-info-container *').remove()   

                    // 2b. Client   
                    let clientName = clientData.noun_name === "TRUE" ? `The ${projectData.client}` : projectData.client
                    if(clientData.short_name !== "") clientName += ` (${clientData.short_name})`
                    if(clientData.current_name !== "") clientName += `, now ${clientData.current_name}`
                    if(clientData.current_short_name !== "") clientName += ` (${clientData.current_short_name})`
                    if(clientData.current_URL !== "") clientName = `<a href = ${clientData.current_URL} target="_blank"> ${clientName}</a>`

                    if(projectData.project_type !== 'lab'){
                        const clientRow = infoContainer.append('div').classed('project-details-row-container', true),
                            clientLocationRow = infoContainer.append('div').classed('project-details-row-container', true)
                        clientRow.append('div').classed('project-details-label', true).html('Client')
                        clientRow.append('div').classed('project-details-content', true).html(`${clientName}`)

                        clientLocationRow.append('div').classed('project-details-label', true).html('Location')
                        clientLocationRow.append('div').classed('project-details-content', true).html(`${clientData.location_city}, ${clientData.location_country}`)
                    }

                    // 2c. Project website link
                    if(projectData.project_url){
                        const websiteRow = infoContainer.append('div').classed('project-details-row-container', true)
                        websiteRow.append('div').classed('project-details-label', true).html(`Project website:`)
                        websiteRow.append('div').classed('project-details-content', true).html(`<a href = ${projectData.project_url} target="_blank">${projectData.project_url}</a>`)
                    }

                    // 2d. Project value and project delivery (type and date) string
                    let displayValue = d3.format("$,.0f")(projectValue)
                    if(settings.layout.roundValue){
                        if(projectValue <= 10000){  
                            displayValue = `Under $10,000`
                        } else if(projectValue <= 30000){  
                            displayValue = `$10,000 to $30,000`
                        } else if(projectValue <= 60000){  
                            displayValue = `$30,000 to $60,000`
                        } else if(projectValue <= 100000){ 
                            displayValue = `$60,000 to $100,000`
                        } else {
                            displayValue = `Over $100,000`
                        }
                    }

                    const  projectTypeStem = projectData.project_type === 'A residency' ? `${projectData.project_type} undertaken` : projectData.project_type === 'lab' ? `A ${projectData.project_type} project brought to life` : `A ${projectData.project_type} project delivered` 

                    let dateString = `${projectTypeStem} `
                    if(dates.length === 1){
                        dateString += `around ${d3.timeFormat('%B %Y')(dates[0].date)}`
                    } else{
                        const fromDate = dates[0].date, fromYear = fromDate.getFullYear(), fromMonth = fromDate.getMonth(),
                            toDate = dates[dates.length - 1].date, toYear = toDate.getFullYear(), toMonth = toDate.getMonth()
                        if(fromYear === toYear && fromMonth === toMonth){
                            dateString += `around ${d3.timeFormat('%B %Y')(dates[0].date)}`
                        } else if (fromYear === toYear){
                            dateString += `around ${d3.timeFormat('%b ')(dates[0].date)} to ${d3.timeFormat('%b %Y')(dates[dates.length - 1].date)}`
                        } else {
                            dateString += `around ${d3.timeFormat('%b %Y')(dates[0].date)} to ${d3.timeFormat('%b %Y')(dates[dates.length - 1].date)}`
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

                    if(projectData.project_type !== 'lab' && projectData.project_type !== 'pro bono'){
                        const valueRow = infoContainer.append('div').classed('project-details-row-container', true)
                        valueRow.append('div').classed('project-details-label', true).html('Project size:')
                        valueRow.append('div').classed('project-details-content', true).html(`${displayValue}`)

                        const deliveryRow = infoContainer.append('div').classed('project-details-row-container', true)
                        deliveryRow.append('div').classed('project-details-label', true).html('Delivery:')
                        deliveryRow.append('div').classed('project-details-content', true).html(`${dateString}`)
                    }

                    /// 3. Project images
                    d3.selectAll('li.project-img-container').remove()
                    projectData.project_img_array.forEach((imgName, i) =>{
                        imagesContainer.append('li').classed('project-img-container grid__item', true)
                            .style('transform',  projectData.project_img_array.length === 1 ? `translateY(-15%)` : null)
                            .append('img').attr('src', `./img/projects/png/${imgName}.png`)
                    })
                }, // end updateProjectModal

                projectNodeClick: function(event, d){
                    const duration = 2000,
                        dimToSpan = d3.max([window.innerWidth,  window.innerHeight]),
                        nodeBBox = this.getBBox(),
                        nodeMinDim = d3.min([nodeBBox.width, nodeBBox.height]),
                        scaleRequired = dimToSpan / nodeMinDim,
                        nodeID = d.__proto__.id,
                        projectData = data.schema.projects[nodeID],
                        scaleMultiplier = scaleRequired * 0.8
                    //Stop the sim
                    vis.state.simulation.stop()

                    // Disable tooltip and project node interactions
                    d3.select("#tooltip").style('opacity' , 0)
                    d3.selectAll(`.project-node`).style('pointer-events', 'none')
                        .on('mouseover', null)
                        .on('mouseout', null)

                    // Prepare modal info
                    vis.methods.ui.updateProjectModal(nodeID)
                    d3.selectAll(`.project-node:not(.${nodeID}), .project-value-bg, .node-bg, .project-node-outline, .project-link, .title-container`)
                        .transition().duration(duration * 0.25)
                        .style('opacity', 0)

                    // Scale up selected node and 
                    d3.select(this).style('filter', `grayscale(0)`)
                        .transition().duration(duration * 0.75).delay(duration * 0.25)
                        .style('transform', `scale(${scaleRequired * scaleMultiplier})`)
                        .style('filter', `grayscale(0.8)`)
                    d3.select('#project-details-container').classed('hidden', false)
                        .style('opacity', 0)
                        .transition().duration(duration * 0.75).delay(duration * 0.25)
                            .style('opacity', null)

                    // Ensure close button event is attach
                    d3.select('.project-close-button').on('click', vis.methods.ui.projectNodeExit)

                    // Hide (disable) the main title (buttons)
                    setTimeout(() => {
                        d3.select('.title-container').style('display', 'none')  
                    }, duration * 0.25);
                }, // end projectNodeClick

                projectNodeExit: function(event, d){  
                    const duration = 2000
                    vis.state.simulation.restart()
                    // Fade out modal and scale node back down
                    d3.selectAll(`.project-node`).transition().duration(duration * 0.75)
                        .style('transform', null).style('filter', `grayscale(0)`)
                    d3.select('#project-details-container')
                        .transition().duration(duration * 0.75)
                        .style('opacity', 0)

                    setTimeout(() => {
                        d3.select('#project-details-container').classed('hidden', true)
                        vis.methods.ui.nodeMouseout() // Reset all nodes
                        d3.select('.title-container').style('display', null)
                            .transition().duration(duration * 0.25)
                            .style('opacity', null)

                        setTimeout(() => {
                            // Reattach/set node and svg event listeners
                            d3.selectAll(`.project-node`).style('pointer-events', 'auto')
                                .on('mouseover', vis.methods.ui.nodeMouseover)
                                .on('mouseout', vis.methods.ui.nodeMouseout)
                            vis.els.svg.on('click', null)
                        }, duration * 0.25);
                    }, duration * 0.75);
                }, // end projectNodeExit

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
        angle: (p1, p2) => Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI,
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

    // Detect touch device

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
            if(projObj[key] !== '')   partners.push(projObj[key])
        }

        // b. Create parents array
        const parentIds = []
        if(projObj.link_direct      !== ""){ parentIds.push(projObj.link_direct) }
        if(projObj.link_indirect    !== ""){ parentIds.push(projObj.link_indirect) }
        if(projObj.link_network    !== ""){ parentIds.push(projObj.link_network) }

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

            project_type:       projObj.project_type !== '' ? projObj.project_type : null,
            project_adjective:  projObj.ctg_type !== '' ? projObj.project_adjective : null,
            project_url:        projObj.project_URL !== '' ? projObj.project_URL : null,
            project_img_array:  projObj.img_array !== '' ? JSON.parse(projObj.img_array) : [],
            workObjects:        data.table.timeline.filter(d => d.project_id === projObj.id),

            network_parents:    parentIds,
            network_children:   []
        }
    }

    // d. Re-loop to find and add all children
    for(projArray of Object.entries(data.schema.projects)){
        if(projArray[1].network_parents.length > 0)  projArray[1].network_parents.forEach(id =>  data.schema.projects[id].network_children.push(projArray[0]) )
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
            // Node array concatenated for centerline (LS) year markers and projects
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
            // a. Make a connection to the centerline node
            switch(settings.layout.centralLinks){
                case 'all':
                    // a. Make a connection to the centerline node
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

    ////////////////////////////////////////////////////
    //// 1. SETUP SVG DEFS, CHART AREAS AND LAYERS  ////
    ////////////////////////////////////////////////////

    // a. Set SVG dimensions and canvas size-specfic layout dimensions
    vis.els.svg = d3.select(`#${settings.svgID}`)
        .classed('center-svg', true)
        .attr('viewBox',  `0 0 ${settings.dims.width} ${settings.dims.height} `)

    const width         = settings.dims.width - settings.dims.margin.left - settings.dims.margin.right,
        height          = settings.dims.height - settings.dims.margin.top - settings.dims.margin.bottom,
        centerline      = {x: width * 0.5 + settings.dims.margin.left, y: height * 0.5 + settings.dims.margin.top },
        oneQuarter      = {x: width * 0.25 + settings.dims.margin.left, y: height * 0.25 + settings.dims.margin.top },
        oneThird        = {x: width * 0.3333 + settings.dims.margin.left, y: height * 0.3333 + settings.dims.margin.top },
        twoThird        = {x: width * 0.6667 + settings.dims.margin.left, y: height * 0.6667 + settings.dims.margin.top },
        threeQuarter    = {x: width * 0.75 + settings.dims.margin.left, y: height * 0.75 + settings.dims.margin.top }

    settings.geometry.node = {
        min:             settings.dims.width / 1080 * 5, 
        max:             settings.dims.width / 1080 * 50, 
        center:          settings.dims.width / 1080 * 100,
        cluster:         settings.dims.width / 1080 * 60,
        centralCluster:  settings.dims.width / 1080 * 130
    }

    // b. Set SVG filter effects (in <defs>) and layer groups
    addFilters(vis.els.svg)

    vis.els.chartArea = vis.els.svg.append('g').attr('id', 'chart-group')
        .attr('transform', `translate(${settings.dims.margin.left}, ${settings.dims.margin.top})`)
    vis.els.annotation = vis.els.svg.append('g').attr('id', 'annotation-group')

    // c. Add geometry and annotation/menu components
    setClusterPositions()
    setupAnnotations()
    addClusterMenu()

    // d. Set data scales
    vis.scales = {
        timeX:          d3.scaleTime().domain(d3.extent(data.list.yearDates ))
                            .range([settings.dims.margin.left,  settings.dims.width - settings.dims.margin.right * 1.5]),
        timeY:          d3.scaleTime().domain(d3.extent(data.list.yearDates))
                            .range([centerline.y + height * 0.45,  centerline.y - height * 0.3 ]),
        timeRadial:     d3.scaleLinear().domain(d3.extent(data.list.dates))
                            .range([width * 0.15, width * 0.45]),

        valueRadius:    d3.scaleSqrt().domain(d3.extent(data.list.projectValues_LS))
                            .range([settings.geometry.node.min, settings.geometry.node.max]),
        valueY:         d3.scaleLinear().domain(d3.extent(data.list.projectValues_LS))
                            .range([threeQuarter.y,  oneQuarter.y]),
        valueStrength:   d3.scaleLinear().domain(d3.extent(data.list.projectValues_LS))
                            .range([0.075,  0.15]),

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
                            .range([settings.geometry.node.center * 2, width * 0.45]),

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


    //////////////////////////////////////
    //// 2. SETUP FORCE SIMULATIONS   ////
    //////////////////////////////////////

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
            vis.state.visibility.lsLabel = true
            vis.state.visibility.clusterSelector = false
            vis.state.layout.nodeScale = 1
            vis.state.layout.lsNodeScale = 1
            vis.methods.layout.nodeResize()

            // 1 .Set new simulation forces
            vis.state.simulation  =  d3.forceSimulation(vis.data.nodes)
                .force("charge", null)
                .force("center", d3.forceCenter(centerline.x, centerline.y -  settings.geometry.node.center ).strength(0.05) )
                .force("collision", d3.forceCollide()
                    .radius( d =>  d.__proto__.type === 'ls-node' ? settings.geometry.node.center 
                        :  d.__proto__.type ?  0
                            : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS)  + (settings.dims.width / 1080 * 2.5)
                    )
                )
                .force("x", d3.forceX().x(centerline.x)
                    .strength( d => d.__proto__.type ? 0.5 : 0.1)
                )
                .force("y", d3.forceY()
                    .y(d =>  d.__proto__.type ?  oneThird.y  : centerline.y)
                    .strength( d => d.__proto__.type ? 0.25 : 1)
                )
                .force("radial", null)
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(null) )

            // 2. Fixed node settings for non-project nodes (year labels and central node)
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = centerline.x
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
            vis.state.visibility.lsLabel = true
            vis.state.visibility.clusterSelector = false
            vis.state.layout.nodeScale = 0.7
            vis.state.layout.lsNodeScale = 0.7
            vis.methods.layout.nodeResize()

            // 1. Set Cluster positions
            const clusterNames = data.list[vis.state.layout.clusterType],
                clusterPos =  settings.clusters[vis.state.layout.clusterType]            

            // 2 .Set new simulation forces
            vis.state.simulation  =  d3.forceSimulation(vis.data.nodes)
                .force("charge", d3.forceManyBody().strength(d => d.__proto__.type  ? 0 : -0.3))
                .force("center", null )
                .force("collision", d3.forceCollide()
                    .radius( d =>  d.__proto__.type === 'ls-node' ? settings.geometry.node.center 
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
                        return d.__proto__.type ? centerline.x  : clusterPos[clusterIDX].x
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
                        return d.__proto__.type ? centerline.y  : clusterPos[clusterIDX].y
                    })
                    .strength( d => d.__proto__.type ? 1 : 0.1)
                )
                .force("radial", null)
                .force("radial", d3.forceRadial()
                    .radius(d =>  d.__proto__.type ? 0 : settings.dims.width * 0.375 )
                    .x(centerline.x)
                    .y(centerline.y)
                    .strength(0.005)
                )
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(null) )

            // 2. Fixed node settings for non-project nodes (year labels and central node)
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = centerline.x
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
            vis.state.visibility.lsLabel = false
            vis.state.visibility.clusterSelector = true
            vis.state.layout.nodeScale = 1
            vis.state.layout.lsNodeScale = 0.7
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
                .force("center", d3.forceCenter(centerline.x, centerline.y).strength(0.1) )
                .force("collision", d3.forceCollide()
                    .radius( d => d.__proto__.type === 'cluster-inner' ?  settings.geometry.node.centralCluster
                        :  d.__proto__.type ?  0
                            : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) + settings.dims.width / 1080 * 5
                    )
                )
                .force("x", d3.forceX()
                    .x( d =>  d.__proto__.type === 'ls-node' ? centerline.x : null )
                    .strength(d =>  d.__proto__.type === 'ls-node' ? 1: null)
                )
                .force("y", d3.forceY()
                    .y( d => d.__proto__.type === 'ls-node' ? centerline.y + 20: null)
                    .strength(d => d.__proto__.type === 'ls-node' ? 1: null)
                )
                .force("radial", d3.forceRadial()
                    .radius(d =>  d.__proto__.type ? 0 : 
                        (data.schema.projects[d.__proto__.id][searchKey].indexOf(clusterName) > -1) ? settings.geometry.node.centralCluster 
                        : settings.dims.width * 0.4 
                    )
                    .x(centerline.x)
                    .y(centerline.y)
                    .strength(1)
                )
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(null) )
                .velocityDecay(0.8)

            // 4. Fixed node settings for non-project nodes (year labels and central node)
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = centerline.x
                vis.data.nodes[i].fy = centerline.y
            })
            vis.data.nodes[data.list.years.length].fx = null
            vis.data.nodes[data.list.years.length].fy = null

            const noNonProjectNodes = data.list.years.length + 1 +  data.list.orgType.length
            vis.data.nodes[noNonProjectNodes].fx = centerline.x
            vis.data.nodes[noNonProjectNodes].fy = centerline.y

        },

        circle: () => {
            // 0.  Set link and label visibility, and node scales
            vis.state.visibility.yearLabels = false
            vis.state.visibility.clusterLabels = false
            vis.state.visibility.centralClusterLabel = false
            vis.state.visibility.links = false
            vis.state.visibility.lsLabel = true
            vis.state.visibility.clusterSelector = false
            vis.state.layout.nodeScale = 1
            vis.state.layout.lsNodeScale = 1.25
            vis.methods.layout.nodeResize()

            // 1. Set new simulation forces for circular layout
            vis.state.simulation  =  d3.forceSimulation(vis.data.nodes)
                .force("charge", d3.forceManyBody().strength( d => d.__proto__.type  ? 0 : -100) )
                .force("center", null )
                .force("collision", d3.forceCollide()
                    .radius( d =>   d.__proto__.type === 'ls-node' ? settings.geometry.node.center  :  d.__proto__.type ? 0
                        : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) + (settings.dims.width / 1080 * 5) )
                )
                .force("radial", d3.forceRadial()
                    .radius(d =>  d.__proto__.type ? 0 : settings.dims.width * 0.25 )
                    .x(centerline.x)
                    .y(centerline.y)
                    .strength(1)
                )
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(0) )

            // 2. Fixed node settings for non-project nodes (year labels and central node) 
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = centerline.x
                vis.data.nodes[i].fy = centerline.y
            })
            vis.data.nodes[data.list.years.length].fx = centerline.x
            vis.data.nodes[data.list.years.length].fy = centerline.y
        },

        timelineX: () => { 
            // 0. Set link and label visibility, and node scales
            vis.state.visibility.yearLabels = true
            vis.state.visibility.clusterLabels = false
            vis.state.visibility.centralClusterLabel = false
            vis.state.visibility.links = false
            vis.state.visibility.lsLabel = true
            vis.state.visibility.clusterSelector = false
            vis.state.layout.nodeScale = 1
            vis.state.layout.lsNodeScale = 1
            vis.methods.layout.nodeResize()

            // 1. Set new simulation forces for x-axis timeline layout
            vis.state.simulation  = d3.forceSimulation(vis.data.nodes)
                .force("charge", d3.forceManyBody().strength( d => d.__proto__.type ? 40 : 0) )
                .force("center", null )
                .force("collision", d3.forceCollide().radius( d =>  d.__proto__.type === 'ls-node' ? settings.geometry.node.center 
                    : d.__proto__.type === 'year-node' ? settings.dims.width / 1080 * 35
                        : d.__proto__.type ? 0
                            : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) + settings.dims.width / 1080 * 5 )
                )
                .force("x", d3.forceX().x( d => d.__proto__.type ? centerline.x:  d3.mean(data.schema.projects[d.__proto__.id].workObjects.map(d => vis.scales.timeX(d.date)) ) )
                    .strength(d => d.type ? 1: 0.45)
                )
                .force("y", d3.forceY().y( d => d.__proto__.type ? oneQuarter.y  : centerline.y)
                    .strength(d => d.type ? 1 : 0.15)
                )
                .force("radial", null)
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(0) )

            // 2. Fixed node settings for non-project nodes (year labels and central node) and label visibility
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = vis.scales.timeX(new Date(year, 1, 1))
                vis.data.nodes[i].fy = centerline.y
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
            vis.state.visibility.lsLabel = true
            vis.state.visibility.clusterSelector = false
            vis.state.layout.nodeScale = 1
            vis.state.layout.lsNodeScale = 1
            vis.methods.layout.nodeResize()

            // 1. Set new simulation forces for diagonal 'xy-axis' timeline layout
            vis.state.simulation  = d3.forceSimulation(vis.data.nodes)
                .force("charge", d3.forceManyBody().strength( d => d.__proto__.type ? 10 : 0) )
                .force("center", null )
                .force("collision", d3.forceCollide()
                    .radius( d  => d.__proto__.type === 'ls-node' ? settings.geometry.node.center 
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
            vis.state.visibility.links = false
            vis.state.visibility.lsLabel = true
            vis.state.visibility.clusterSelector = false
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
                const spiralGroup = vis.els.chartArea.append('g').classed('gridline', true)
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

                    const spiralSector = vis.els.chartArea.append('g').attr('transform', `translate(${width * 0.5}, ${height * 0.5})`) 
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
                .force("center", null )          
                .force("collision", d3.forceCollide()
                    .radius( d  => d.__proto__.type === 'ls-node' ? settings.geometry.node.center 
                        : d.__proto__.type === 'year-node' ? settings.dims.width / 1080 * 35 
                            :  d.__proto__.type  ? 0
                                : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) + (settings.dims.width / 1080 * 5)
                    )  
                )
                .force("x", d3.forceX()
                    .x( d => d.__proto__.type ?  centerline.x : spiralPath.getPointAtLength( d3.mean(data.schema.projects[d.__proto__.id].workObjects.map(d => spiralTimescale(d.date))) ).x + centerline.x)
                    .strength(d => d.__proto__.type ? 5 : 0.5)
                )
                .force("y", d3.forceY()
                    .y( (d, i) => d.__proto__.type ?  centerline.y : spiralPath.getPointAtLength( d3.mean(data.schema.projects[d.__proto__.id].workObjects.map(d => spiralTimescale(d.date))) ).y + centerline.y)
                    .strength(d => d.__proto__.type ? 5 : 0.5)
                )
                .force("radial", null)
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(null) )
                .velocityDecay(0.7)

            // 3. Fixed node settings for non-project nodes (year labels and central node)
            spiralYears.forEach( (date, i) => {
                vis.data.nodes[i].fx = spiralPath.getPointAtLength(spiralTimescale(date)).x + centerline.x
                vis.data.nodes[i].fy = spiralPath.getPointAtLength(spiralTimescale(date)).y + centerline.y
            })
            vis.data.nodes[data.list.years.length].fx = null
            vis.data.nodes[data.list.years.length].fy = null

            d3.select('.gridline.spiral')
                .attr('stroke-dasharray', `${spiralPathLength}px ${spiralPathLength}px`)
                .attr('stroke-dashoffset', `${spiralPathLength}px`) 
                .style('stroke-opacity', 1)     
                .style('stroke-width', 1)     
                .transition().duration(10000)
                    .attr('stroke-dashoffset', `0px`)   
                    .transition().duration(2000)
                        .style('stroke-opacity', null)     
                        .style('stroke-width', null)  
        },

        radialMoon: () => { 
            // 0. Set link and label visibility, and node scales
            vis.state.visibility.yearLabels = false
            vis.state.visibility.clusterLabels = false
            vis.state.visibility.centralClusterLabel = false
            vis.state.visibility.links = false
            vis.state.visibility.lsLabel = true
            vis.state.visibility.clusterSelector = false
            vis.state.layout.nodeScale = 1
            vis.state.layout.lsNodeScale = 1
            vis.methods.layout.nodeResize()

            // 1. Set new simulation forces for x-axis timeline layout
            vis.state.simulation  = d3.forceSimulation(vis.data.nodes)
                .force("collision", d3.forceCollide().radius( d =>  d.__proto__.type === 'ls-node' ? settings.geometry.node.center 
                    : d.__proto__.type === 'year-node' ? settings.dims.width / 1080 * 35
                        : d.__proto__.type ? 0
                            : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) + settings.dims.width / 1080 * 5 )
                )
                .force("x", d3.forceX()
                    .x( d => {
                        const projectData = d.__proto__.type ? null : data.schema.projects[d.__proto__.id]
                        return !projectData ? oneQuarter.x : twoThird.x 
                    })
                    .strength(d => d.type ? 3 : 0.30)
                )
                .force("y", d3.forceY()
                    .y( d => {
                        const projectData = d.__proto__.type ? null : data.schema.projects[d.__proto__.id]
                        return !projectData ? centerline.y : centerline.y  
                    })
                    .strength(d => {
                        const projectData = d.__proto__.type ? null : data.schema.projects[d.__proto__.id]
                        return !projectData ? 2.5 : vis.scales.valueStrength(projectData.value_LS) 
                    })
                )
                .force("radialStoryProjects", d3.forceRadial()
                    .radius(d => settings.dims.width * 0.45 )
                    .x(oneThird.x)
                    .y(centerline.y)
                    .strength(d => {
                        const projectData = d.__proto__.type ? null : data.schema.projects[d.__proto__.id]
                        return !projectData ? 0 : 1.5 
                    })
                )
                .velocityDecay(0.7)

            // 2. Fixed node settings for non-project nodes (year labels and central node) and label visibility
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = null
                vis.data.nodes[i].fy = null
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
            vis.state.visibility.lsLabel = true
            vis.state.visibility.clusterSelector = false
            vis.state.layout.nodeScale = 0.8
            vis.state.layout.lsNodeScale = 0.5
            vis.methods.layout.nodeResize()

            // 1. Set new simulation forces for the radial constellation layout
            vis.state.simulation  =  d3.forceSimulation(vis.data.nodes)
                .force("charge", d3.forceManyBody().strength( (d, i) => d.type  ? vis.scales.valueCharge(settings.geometry.node.center) : -100) )
                .force("center", d3.forceCenter(centerline.x, centerline.y) )
                .force("collision", d3.forceCollide()
                    .radius( d  => d.__proto__.type === 'ls-node' ? settings.geometry.node.center 
                        : d.__proto__.type === 'year-node' ? settings.dims.width / 1080 * 35
                            :  d.__proto__.type ? 0
                                : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) + (settings.dims.width / 1080 * 5)
                    )  
                )
                .force("x", null)
                .force("y", null)
                .force("radial", d3.forceRadial()
                    .radius(d =>  d.type ? 0  : d3.mean(data.schema.projects[d.__proto__.id].workObjects.map(d => vis.scales.timeRadial(d.date))) )
                    .x(centerline.x)
                    .y(centerline.y)
                    .strength(d => d.type  !== 'year-node' ? 1 : 1000)
                )
                .force("link", d3.forceLink(vis.data.links)
                    .id(d => d.id)
                    .strength(0.2)
                )
                .velocityDecay(0.7)
        
            // 2. Fixed node settings for non-project nodes (year labels and central node) and gridlines
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = centerline.x
                vis.data.nodes[i].fy = centerline.y + vis.scales.timeRadial(new Date(year, 6, 30))

                vis.els.chartArea.append('circle')
                    .classed('gridline radial-year', true)
                    .attr('r', vis.scales.timeRadial(new Date(year, 1, 1)))
                    .attr('cx', width * 0.5)
                    .attr('cy', height * 0.5)               
                    .style('opacity', 0)
                        .transition().duration(100).delay(i * 100)
                        .style('opacity', null)
                        .style('stroke-width', '1px')
                        .style('stroke-opacity', 1)
                        .transition().duration(800).delay(100 * (data.list.years.length - 2))
                            .style('stroke-width', null)
                            .style('stroke-opacity', null)
            })

            d3.select('.link-group').style('opacity', 0)
                .transition().duration(2000).delay(2000)
                .style('opacity', null)
        },

        constellationHorizon: (type = vis.state.layout.ratingName) => {
            // 0.  Set link and label visibility, and node scales
            vis.state.visibility.yearLabels = true
            vis.state.visibility.clusterLabels = false
            vis.state.visibility.centralClusterLabel = false
            vis.state.visibility.links = true
            vis.state.visibility.lsLabel = true
            vis.state.visibility.clusterSelector = false
            vis.state.layout.nodeScale = 0.8
            vis.state.layout.lsNodeScale = 0.8
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
                .force("charge", d3.forceManyBody().strength( (d, i) => d.__proto__.type ? 10 : 0) )
                .force("centerline", null)
                .force("collision", d3.forceCollide()
                    .radius( (d, i) =>  d.__proto__.type === 'ls-node' ? settings.geometry.node.center 
                        : d.__proto__.type ?  0 
                            : vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS) * 1.5 
                    )
                )
                .force("x", d3.forceX().x( d => d.__proto__.type ? width - settings.dims.margin.right :  d3.mean(data.schema.projects[d.__proto__.id].workObjects.map(d => vis.scales.timeX(d.date)) ) )
                    .strength(d => d.__proto__.type ? 1: 0.5)
                )
                .force("y", d3.forceY().y( d =>  d.__proto__.type ? settings.dims.margin.top   :  ratingScale(data.schema.projects[d.__proto__.id][ratingName] )  )
                    .strength(d => d.__proto__.type ? 1: 0.5)
                )
                .force("radial", null)
                .force("link", d3.forceLink(vis.data.links).id(d => d.id).strength(0) )

            // 2. Fixed node settings for non-project nodes (year labels and central node) 
            data.list.years.forEach( (year, i) => {
                vis.data.nodes[i].fx = vis.scales.timeX(new Date(year, 1, 1))
                vis.data.nodes[i].fy = settings.dims.height - settings.dims.margin.bottom
            })
            vis.data.nodes[data.list.years.length].fx = null
            vis.data.nodes[data.list.years.length].fy = null
        }
    }

    /////////////////////////////////////
    ////  3. RENDER LINKS AND NODES  ////
    /////////////////////////////////////

    // a. Add links paths (as straight lines)
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
            .attr("d", d => typeof d.__proto__.type !== 'undefined' ? null : helpers.circlePath(vis.scales.valueRadius( data.schema.projects[d.__proto__.id].value_LS + d3.sum(data.schema.projects[d.__proto__.id].value_partners)) ) )

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
            .on('mouseover', vis.methods.ui.nodeMouseover)
            .on('mouseout', vis.methods.ui.nodeMouseout)  
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
        vis.els.lsNode = d3.select('.ls-node-group')
        const lsNodeContainer = vis.els.lsNode.append('g')
            .classed('ls-node-icon-container', true)
            .on('mouseover', vis.methods.ui.lsNodeMouseover)
            .on('mouseout', vis.methods.ui.nodeMouseout)

        lsNodeContainer.append('path').classed('ls-node', true).attr('d', settings.geometry.icon.heart750)
        lsNodeContainer.append('text').classed('ls-node-label', true).attr('y', -20).text('Little')
        lsNodeContainer.append('text').classed('ls-node-label', true).attr('y', 10).text('Sketches')

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


    /////////////////////////////////////////
    ////  START SIMULATION AND SETUP VIS ////
    /////////////////////////////////////////

    vis.methods.ui.updateSimLayout(vis.state.sim.name)
    d3.select('.button-next').on('click', () => vis.methods.ui.changeSim(true))
    d3.select('.button-prev').on('click', () => vis.methods.ui.changeSim(false))


    ///////////////////////////////////////////////
    ////  VIS SETUP AND EVENT HANDLER METHODS ////
    ///////////////////////////////////////////////
    
    // VIS SETUP
    function setupAnnotations(){
        // 1. Add annotation elements
        vis.els.annotation.classed('narrative annotation-group', true)
            .attr('transform', `translate(${centerline.x}, ${centerline.y})`)
        vis.els.annotation.append('text').classed('annotation', true)
            .attr('x', 0).attr('y', 0).attr('dy', 0)

        // 2. Add annotation settings
        settings.scene.simOrder = [
            {   name:       'circle',                
                title:      'Little constellations', 
                annotation: 'Welcome to our project explorer. Navigate with the arrow buttons, play with whatever you can, and set controls for the heart of the sun.',
                posX:       centerline.x,
                posY:       height + settings.dims.margin.top,
                wrapWidth:  width * 0.65,
                textAnchor: 'middle'
            },
            {   name:       'clusterHuddle',         
                title:      'All my friends', // LCD Soundsystem
                annotation: `These playful little shapes represent projects done by Little Sketches (so far). All the orbs are paid projects sized by their value, while pro bono jobs are hearts sized by a notional value. The glow surrounding some projects means that we worked with partners. And finally, the beakers represent some of the ‘more finished' experimental speculative design projects we’ve been doing.`,
                posX:       centerline.x,
                posY:       threeQuarter.y,
                wrapWidth:  width * 0.65,
                textAnchor: 'middle'
            },
            {   name:       'clusterMultiFoci',      
                title:      'Everything in its right place', // Radiohead
                annotation: `These clusters show what the colour coding of each project means: they group projects by the type of clients or audience each piece is for. You can tap or hover over a project to learn a little bit about it, and to see who we've worked with, and how that project might be connected to others.`,
                posX:       centerline.x,
                posY:       twoThird.y,
                wrapWidth:  width * 0.5,
                textAnchor: 'middle'
            },
            {   name:       'timelineX',    
                title:      'Wave of mutilation', // The Pixies
                annotation: `Seeing when work was completed is a useful way to see how the shapes and sizes of our projects has evolved over time. It's also a a great way to illustrate a project's lineage.`,
                posX:       centerline.x,
                posY:       threeQuarter.y,
                wrapWidth:  width * 0.8,
                textAnchor: 'middle'
            },
            {   name:       'timelineXY',            
                title:      'Inertia creeps',   // Massive Attack
                annotation: `Changing the angle of a timeline here doesn't really reveal anything new. But it's is shaped a little like the Milky Way and is just a bit delightful. And we really like that!`,
                posX:       threeQuarter.x,
                posY:       threeQuarter.y + oneQuarter.y * 0.5,
                wrapWidth:  width * 0.4,
                textAnchor: 'middle'
            },
            {   name:       'timelineSpiral',      
                title:      'Road to nowhere',  // Talking Heads
                annotation: `Putting all our work on a spiralling timeline is fascinating way to explore the patterns of project work...`   ,
                posX:       centerline.x,
                posY:       settings.dims.margin.top * 0.5,
                wrapWidth:  width * 0.8,
                textAnchor: 'middle'
            },
            {   name:       'constellationRadial',   
                title:      'Wandering star',       // Portishead
                annotation: `Letting these projects wander within a concentric timeline produces some mesmerising ways of looking different constellations or projects. Untangling constellations by dragging projects around can also be strangely relaxing waste of time.`,
                posX:       centerline.x,
                posY:       settings.dims.margin.top * 0.5,
                wrapWidth:  width * 0.8,
                textAnchor: 'middle'
            },
            {   name:       'constellationHorizon',  
                title:      'The sky lit up',       // PJ Harvey
                annotation: `Visualising stuff like project value, client type an delivery times is kinda of interesting, but it's also a bit serious and boring at the same time. Here view we've assessed projects by some other criteria to see what work ascends to the heavens..`,
                posX:       settings.dims.margin.left,
                posY:       settings.dims.margin.top,
                wrapWidth:  width * 0.5,
                textAnchor: 'start'
            },
            {   name:       'clusterFocus',         
                title:      'Space oddity',         // David Bowie
                annotation: '',
                posX:       settings.dims.margin.left,
                posY:       settings.dims.margin.top * 0.5,
                wrapWidth:  width * 0.35,
                textAnchor: 'start'
            },
            {   name:       'radialMoon',         
                title:      'Marquee moon',         // Television
                annotation: 'Story time! In this view you can tap on any project to read and see more about it..',
                posX:       oneQuarter.x,
                posY:       oneQuarter.y,
                wrapWidth:  width * 0.30,
                textAnchor: 'middle'
            }
        ] 

        // 3. Call the initial setup 
        vis.methods.ui.updateAnnotation()
    };

    function addClusterMenu(){
        const menuGroup = vis.els.svg.append('g').classed('cluster-menu menu-group annotation-group', true)
                .attr('transform', `translate(${settings.dims.margin.left}, ${settings.dims.margin.top * 0.25})`)
        menuGroup.append('text')
            .classed('menu-header', true)
            .text('Explore by theme:')

        const lineSpacing = 26
        Object.entries(settings.labels.map).forEach( ([key, label] , i) => {
            menuGroup.append('text').classed(`menu-item ${key}`, true)
                .attr('y', 30 + i * lineSpacing)
                .text(label)      
                .on('click', function(){
                    d3.selectAll(`.menu-item`).classed('selected', false)
                    d3.select(this).classed('selected', true)
                    vis.state.layout.clusterGroup = key.slice(4)
                    vis.state.layout.clusterFocus = "Tap here" 
                    vis.methods.ui.updateSimLayout('clusterFocus')
                })
        }) 

        // Set selected item and visibility
        d3.select(`.menu-item.ctg_${vis.state.layout.clusterGroup}`).classed('selected', true)
        d3.select('.cluster-menu').style('opacity', vis.state.visibility.clusterSelector ? null : 0)
        d3.selectAll('.cluster-item').style('pointer-events', vis.state.visibility.clusterSelector ? null : 'none')
    };

    function setClusterPositions(){
        settings.clusters = {
            orgType: {
                0: { //'Community'
                    x:  centerline.x,
                    y:  oneQuarter.y / 2
                },
                1: { //'Education and research'
                    x:  centerline.x,
                    y:  threeQuarter.y + oneQuarter.y /2
                },
                2: { // 'Non-government organisation' 
                    x:  oneQuarter.x * 0.5,
                    y:  oneThird.y
                },
                3: { //  'Non-for-profit'
                    x:  threeQuarter.x + oneQuarter.x * 0.5,
                    y:  oneThird.y
                },
                4: { // Private sector
                    x:  threeQuarter.x + oneQuarter.x * 0.5,
                    y:  twoThird.y
                },
                5: { // Public sector
                    x:  oneQuarter.x * 0.5,
                    y:  twoThird.y
                }
            }
        }
    };

    // Key press views
    document.addEventListener("keypress",  async (event) =>{ 
        console.log(event.keyCode)
        switch(event.keyCode){
            case 32:  // Space
                d3.selectAll('.project-link').transition().duration(800).style('opacity', null)
                break
        }
    });


}; //end renderVis()
