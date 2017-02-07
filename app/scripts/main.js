const createCanvas = () => ({
  html: d3.select('body').append('div')
    .classed('canvas', true)
    .style('top', '5px')
    .style('left', '5px'),
  svg: d3.select('.canvas').append('svg')
    .style('x', 5)
    .style('y', 5)
})

const updateCanvasSize = ({ html, svg }) => (
  html
    .style('height', `${document.documentElement.clientHeight - 10}px`)
    .style('width', `${document.documentElement.clientWidth - 10}px`),
  svg
    .style('height', `${document.documentElement.clientHeight - 10}px`)
    .style('width', `${document.documentElement.clientWidth - 10}px`)
)

/**
 * @param panel {d3}
 * @param rowDef {Object}   { text, name, }
 */
const createRow = (panel, rowDef, output = false) => {
  const row = panel.append('div')
    .classed('node-row', true)
  
  output
    ? row.attr('data-output', rowDef.name)
    : row.attr('data-input', rowDef.name)

  row.append('span')
    .text(rowDef.text)

  row.append('div')
    .classed('node-row-point', true)

  return row
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
 * @param nodeDef {Object}   { name, }
 */
const addNode = (canvas, nodeDef) => {
  const node = canvas.append('div')
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

  nodeDef.inputs && nodeDef.inputs.forEach(row => createRow(left, row))
  nodeDef.outputs && nodeDef.outputs.forEach(row => createRow(right, row))

  header.call(
    d3.drag()
    .subject(() => ({
      top: parseInt(node.style('top'), 10),
      left: parseInt(node.style('left'), 10),
    }))
    .container(() => canvas.node())
    .filter(() => d3.event.target == header.node())
    .on('start', onNodeMove(node))
  )

  return node
}

const createConnection = (canvas, nodeFrom, output, nodeTo, input) => {
  
}

// =======================================================================================

const canvas = createCanvas()
updateCanvasSize(canvas)
window.addEventListener('resize', () => updateCanvasSize(canvas))

const node = addNode(canvas.html, {
  name: 'Horizontal interactor',
  position: {
    top: 50,
    left: 600,
  },
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

const node2 = addNode(canvas.html, {
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

const node3 = addNode(canvas.html, {
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

/*

const node4 = addNode(canvas.html, {
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

const getter = addNode(canvas.html, {
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

const setter = addNode(canvas.html, {
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