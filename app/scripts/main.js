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

  return { row, text, point, name: rowDef.name }
}

/**
 * @param node {Object}
 */
const onNodeMove = node => () => {
  const {
    top,
    left
  } = d3.event.subject
  const offTop = d3.event.y - top
  const offLeft = d3.event.x - left

  d3.event.on('drag', () => {
    const mTop = d3.event.y - offTop
    const mLeft = d3.event.x - offLeft

    node.style('top', `${mTop}px`).style('left', `${mLeft}px`)
  })
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
  const outputs = nodeDef.outputs.map(row => createRow(right, row))

  header.call(
    d3.drag()
    .subject(() => ({
      top: parseInt(node.style('top'), 10),
      left: parseInt(node.style('left'), 10),
    }))
    .container(() => canvas.html.node())
    .filter(() => d3.event.target == header.node())
    .on('start', onNodeMove(node))
  )

  return { node, inputs, outputs, header, definition: nodeDef }
}

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
  console.log({ from, output, to, input })
  console.log({ inlet, outlet })

  if (!inlet)
    throw new Error(`Inlet "${input}" not found!`)
  if (!outlet) 
    throw new Error(`Outlet "${output}" not found!`)

  const centerTo = getCenterOfPoint(inlet.point)
  const centerFrom = getCenterOfPoint(outlet.point)

  const connection = canvas.svg.append('path')
    .attr('d', makeLine([
      centerFrom,
      { top: centerFrom.top, left: centerFrom.left + LINE_GROW_OFFSET },
      { top: centerTo.top, left: centerTo.left - LINE_GROW_OFFSET },
      centerTo,
    ]))
  
  return { connection, inlet, outlet }
}

// =======================================================================================

const canvas = createCanvas()
updateCanvasSize(canvas)
window.addEventListener('resize', () => updateCanvasSize(canvas))

const node = addNode(canvas, {
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

const node2 = addNode(canvas, {
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

const node3 = addNode(canvas, {
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

const nodeS = addNode(canvas, {
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


const conn1 = createConnection(canvas, {
  from: node2, output: 'other_body_index',
  to: node3, input: 'x',
})

const conn2 = createConnection(canvas, {
  from: node3, output: 'return_value',
  to: node, input: 'contextual_resolver',
})

const conn3 = createConnection(canvas, {
  from: node2, output: 'other_actor',
  to: node, input: 'initial_value',
})

const conn4 = createConnection(canvas, {
  from: node2, output: 'other_comp',
  to: nodeS, input: 'input',
})

const conn5 = createConnection(canvas, {
  from: nodeS, output: 'first',
  to: node3, input: 'z',
})

const conn6 = createConnection(canvas, {
  from: nodeS, output: 'second',
  to: node3, input: 'y',
})

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