const createCanvas = () => ({
  html: d3.select('body').append('div')
    .classed('canvas', true)
    .style('top', '0px')
    .style('left', '0px'),
  svg: d3.select('.canvas').append('svg')
    .style('x', 0)
    .style('y', 0)
})

const updateCanvasSize = ({ html, svg }) => (
  html
    .style('height', `${document.documentElement.clientHeight}px`)
    .style('width', `${document.documentElement.clientWidth}px`),
  svg
    .style('height', `${document.documentElement.clientHeight}px`)
    .style('width', `${document.documentElement.clientWidth}px`)
)

/**
 * @param panel {d3}
 * @param rowDef {Object}   { text, name, }
 * @return {Object}  { row, text, point }
 */
const createRow = (panel, rowDef, output = false) => {
  const row = panel.append('div')
    .classed('node-row', true)
  
  output
    ? row.attr('data-output', rowDef.name)
    : row.attr('data-input', rowDef.name)

  const text = row.append('span')
    .text(rowDef.text)

  const point = row.append('div')
    .classed('node-row-point', true)

  return { row, text, point, name: rowDef.name, def: rowDef }
}

/**
 * @param canvas {Object}    { html, svg }
 * @param nodeDef {Object}   { name, }
 * @return {Object}   { node, inputs, outputs, header }
 */
const addNode = (canvas, nodeDef) => {
  const node = canvas.html.append('div')
    .classed('node', true)
    .classed(`class-${nodeDef.type}`, !!nodeDef.type)
    .style('top', `${nodeDef.position.top || 20}px`)
    .style('left', `${nodeDef.position.left || 20}px`)

  const header = node.append('div')
    .classed('node-header', true)
    .text(nodeDef.name)

  const content = node.append('div').classed('node-content', true)
  const left = content.append('div').classed('node-panel panel-left', true)
  const right = content.append('div').classed('node-panel panel-right', true)

  const inputs = nodeDef.inputs.map(row => createRow(left, row))
  const outputs = nodeDef.outputs.map(row => createRow(right, row, true))

  return { node, inputs, outputs, header, definition: nodeDef }
}

/**
 * @param nodeId {String}    id from registry
 */
const onNodeMove = (registry, nodeId) => () => {
  const node = registry.getNode(nodeId)
  const {
    top,
    left
  } = d3.event.subject
  const offTop = d3.event.y - top
  const offLeft = d3.event.x - left
  
  const offsets = Array.from(node.connections)
    .map(id => registry.getConnection(id))
    .map(def => {
      const { native: { pointFrom, pointTo, node }, to, from } = def
      return {
        def,
        node,
        from: { id: from, offtop: pointFrom.top - top, offleft: pointFrom.left - left },
        to: { id: to, offtop: pointTo.top - top, offleft: pointTo.left - left },
        pointFrom,
        pointTo,
      }
    })
  
  console.log('offsets', offsets)

  d3.event.on('drag', () => {
    const mTop = d3.event.y - offTop
    const mLeft = d3.event.x - offLeft

    node.node.style('top', `${mTop}px`).style('left', `${mLeft}px`)

    offsets.map(def => {
      const { node, from, to, pointFrom, pointTo } = def

      if (to.id === nodeId) {
        node.attr('d', makeLine([
          pointFrom,
          { top: pointFrom.top, left: pointFrom.left + LINE_GROW_OFFSET },
          { top: mTop + to.offtop, left: mLeft + to.offleft - LINE_GROW_OFFSET },
          { top: mTop + to.offtop, left: mLeft + to.offleft },
        ]))

        def.def.native.pointTo.top = mTop + to.offtop
        def.def.native.pointTo.left = mLeft + to.offleft
        return def
      }
      
      if (from.id === nodeId) {
        node.attr('d', makeLine([
          { top: mTop + from.offtop, left: mLeft + from.offleft },
          { top: mTop + from.offtop, left: mLeft + from.offleft + LINE_GROW_OFFSET },
          { top: pointTo.top, left: pointTo.left - LINE_GROW_OFFSET },
          pointTo,
        ]))

        def.def.native.pointFrom.top = mTop + from.offtop
        def.def.native.pointFrom.left = mLeft + from.offleft
      }
    })
  })

  d3.event.on('end', () => {
    offsets.forEach(ee => {
      registry.setConnection(ee.def.id, ee.def)
    })
  })
}

const addMoveHandler = (canvas, registry, node) => 
  node.header.call(
    d3.drag()
    .subject(() => ({
      top: parseInt(node.node.style('top'), 10),
      left: parseInt(node.node.style('left'), 10),
    }))
    .container(() => canvas.html.node())
    .filter(() => d3.event.target == node.header.node())
    .on('start', onNodeMove(registry, node.id))
  )

const getCenterOfPoint = point => {
  const { top, left, width, height } = point.node().getBoundingClientRect()

  return {
    top: top + (height / 2),
    left: left + (width / 2),
  }
}

const makeLine = d3.line()
  .x(d => d.left)
  .y(d => d.top)
  .curve(d3.curveCatmullRom.alpha(.8))

const LINE_GROW_OFFSET = 20

/**
 * @param canvas {Object}   { html, svg }
 * @param connection {Object}    { from, to, output, input }
 * @return {Object}
 */
const createConnection = (canvas, { from, output, to, input }) => {
  const inlet = to.inputs.filter(put => put.name === input)[0]
  const outlet = from.outputs.filter(put => put.name === output)[0]

  if (!inlet)
    throw new Error(`Inlet "${input}" not found!`)
  if (!outlet) 
    throw new Error(`Outlet "${output}" not found!`)

  const centerTo = getCenterOfPoint(inlet.point)
  const centerFrom = getCenterOfPoint(outlet.point)

  const node = canvas.svg.append('path')
    .attr('d', makeLine([
      centerFrom,
      { top: centerFrom.top, left: centerFrom.left + LINE_GROW_OFFSET },
      { top: centerTo.top, left: centerTo.left - LINE_GROW_OFFSET },
      centerTo,
    ]))
  
  const connection = { node, inlet, outlet, pointFrom: centerFrom, pointTo: centerTo }
  inlet.connection = connection
  outlet.connection = connection

  return connection
}

const createId = i =>
  ((i * 1e14 + Date.now()) * Math.pow(36, 10)).toString(36)


class Registry {
  constructor(canvas) {
    this.canvas = canvas
    this.nodes = new Map()
    this.connections = new Map()
    this.lastId = 0
  }

  addNode(scheme) {
    const id = createId(++this.lastId)

    const node = addNode(this.canvas, scheme)
    node.id = id
    node.connections = new Set()

    addMoveHandler(this.canvas, this, node)

    this.nodes.set(id, node)
    return node
  }

  getNode(id) {
    return this.nodes.get(id)
  }


  dropNode(id) {
    const node = this.nodes.get(id)

    for (const cId of node.connections) {
      this.disconnect(cId)
    }

    this.nodes.delete(id)

    return { node, connections }
  }

  /**
   * @param from {String}     id of node
   * @param to {String}       id of node
   */
  disconnect(connectionId) {
    const connection = this.connections.get(connectionId)
    const fromNode = this.nodes.get(connection.from)
    const toNode = this.nodes.get(connection.to)

    fromNode.connections.delete(connectionId)
    fromNode.connections.delete(connectionId)

    // delete node in svg
    // connection.native.node.delete()

    this.nodes.set(connection.from, fromNode)
    this.nodes.set(connection.to, toNode)
    this.connections.delete(connectionId)
  }

  /**
   * @param from {String}     id of node
   * @param to {String}       id of node
   * @param output {String}   name of output
   * @param input {String}    name of input
   */
  connect({ from, output, to, input }) {
    const fromNode = this.nodes.get(from)
    const toNode = this.nodes.get(to)
    const id = createId(++this.lastId)

    const native = createConnection(
      this.canvas,
      { from: fromNode, output, to: toNode, input }
    )
    
    const connection = { id, native, from, output, to, input }

    fromNode.connections.add(id)
    toNode.connections.add(id)

    this.connections.set(id, connection)
    this.nodes.set(from, fromNode)
    this.nodes.set(to, toNode)

    return connection
  }

  getConnection(id) {
    return this.connections.get(id)
  }

  setConnection(id, connection) {
    this.connections.set(id, connection)
  }
}

// =======================================================================================

const canvas = createCanvas()
updateCanvasSize(canvas)
window.addEventListener('resize', () => updateCanvasSize(canvas))

const registry = new Registry(canvas)

const node = registry.addNode({
  name: 'Horizontal interactor',
  position: {
    top: 50,
    left: 600,
  },
  type: 'function',
  inputs: [{
    name: 'initial_value',
    text: 'Initial value',
  }, {
    name: 'contextual_resolver',
    text: 'Contextual resolver',
  }],
  outputs: [{
    name: 'splitted_value',
    text: 'Splitted value',
  }],
})

const node2 = registry.addNode({
  name: 'OnComponentBeginOverlap (Trigger Volume)',
  position: {
    top: 20,
    left: 20
  },
  type: 'event',
  inputs: [],
  outputs: [{
    name: 'other_actor',
    text: 'Other Actor',
  }, {
    name: 'other_comp',
    text: 'Other Comp',
  }, {
    name: 'other_body_index',
    text: 'Other Body Index',
  }],
})

const node3 = registry.addNode({
  name: 'Make Vector',
  position: {
    top: 200,
    left: 330
  },
  type: 'expression',
  inputs: [{
    name: 'x',
    text: 'X',
  }, {
    name: 'y',
    text: 'Y',
  }, {
    name: 'z',
    text: 'Z',
  }],
  outputs: [{
    name: 'return_value',
    text: 'Return Value',
  }],
})

const nodeS = registry.addNode({
  name: 'Split',
  position: {
    top: 190,
    left: 50,
  },
  inputs: [{ name: 'input', text: 'Input' }],
  outputs: [
    { name: 'first', text: 'First Index' },
    { name: 'second', text: 'Second Index' },
  ]
})


const conn1 = registry.connect({
  from: node2.id, output: 'other_body_index',
  to: node3.id, input: 'x',
})

const conn2 = registry.connect({
  from: node3.id, output: 'return_value',
  to: node.id, input: 'contextual_resolver',
})

const conn3 = registry.connect({
  from: node2.id, output: 'other_actor',
  to: node.id, input: 'initial_value',
})

const conn4 = registry.connect({
  from: node2.id, output: 'other_comp',
  to: nodeS.id, input: 'input',
})

const conn5 = registry.connect({
  from: nodeS.id, output: 'first',
  to: node3.id, input: 'z',
})

const conn6 = registry.connect({
  from: nodeS.id, output: 'second',
  to: node3.id, input: 'y',
})

console.log(node)

/*

const node4 = addNode(canvas, {
  name: 'Add Actor Local Offset',
  position: {
    top: 150,
    left: 380
  },
  type: 'function',
  inputs: [{
    name: 'target',
    text: 'Target',
  }, {
    name: 'delta_location',
    text: 'Delta Location',
  }, {
    name: 'sweep',
    text: 'Sweep',
  }],
  outputs: [{
    name: 'next',
    text: 'Next',
  }],
})

const getter = addNode(canvas, {
  name: 'Get (Inside Variable)',
  position: {
    top: 280,
    left: 20
  },
  type: 'getter',
  inputs: [],
  outputs: [{
    name: 'value',
    text: 'Inside Variable'
  }],
})

const setter = addNode(canvas, {
  name: 'Set (Inside Variable)',
  position: {
    top: 280,
    left: 200
  },
  type: 'setter',
  inputs: [{
    name: 'new_value',
    text: 'New value',
  }],
  outputs: [{
    name: 'value',
    text: 'Inside Variable',
  }],
})

*/