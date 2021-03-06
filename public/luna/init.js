function init() {
    const socket = io()
    socket.on('dom', dom => {
        console.log(dom)
        var $ = go.GraphObject.make  // for conciseness in defining templates

        myDiagram =
          $(go.Diagram, "myDiagramDiv",  // must be the ID or reference to div
            {
              "toolManager.hoverDelay": 100,  // 100 milliseconds instead of the default 850
              allowCopy: false,
              layout:  // create a TreeLayout for the family tree
                $(go.TreeLayout,
                  { angle: 90, nodeSpacing: 10, layerSpacing: 40, layerStyle: go.TreeLayout.LayerUniform })
            })
    
        var bluegrad = '#90CAF9'
        var pinkgrad = '#F48FB1'
    
        // get tooltip text from the object's data
        function tooltipTextConverter(person) {
          var str = ""
          str += "Email: " + person.birthYear
          if (person.deathYear !== undefined) str += "\nBTC: " + person.deathYear
          if (person.reign !== undefined) str += "\nBNB: " + person.reign
          return str
        }
    
        // define tooltips for nodes
        var tooltiptemplate =
          $("ToolTip",
            { "Border.fill": "whitesmoke", "Border.stroke": "black" },
            $(go.TextBlock,
              {
                font: "bold 8pt Helvetica, bold Arial, sans-serif",
                wrap: go.TextBlock.WrapFit,
                margin: 5
              },
              new go.Binding("text", "", tooltipTextConverter))
          )
    
        // define Converters to be used for Bindings
        function genderBrushConverter(gender) {
          if (gender === "M") return bluegrad
          if (gender === "F") return pinkgrad
          return "orange"
        }
    
        // replace the default Node template in the nodeTemplateMap
        myDiagram.nodeTemplate =
          $(go.Node, "Auto",
            { deletable: false, toolTip: tooltiptemplate },
            new go.Binding("text", "name"),
            $(go.Shape, "Rectangle",
              {
                fill: "lightgray",
                stroke: null, strokeWidth: 0,
                stretch: go.GraphObject.Fill,
                alignment: go.Spot.Center
              },
              new go.Binding("fill", "gender", genderBrushConverter)),
            $(go.TextBlock,
              {
                font: "700 12px Droid Serif, sans-serif",
                textAlign: "center",
                margin: 10, maxSize: new go.Size(80, NaN)
              },
              new go.Binding("text", "name"))
          )
    
        // define the Link template
        myDiagram.linkTemplate =
          $(go.Link,  // the whole link panel
            { routing: go.Link.Orthogonal, corner: 5, selectable: false },
            $(go.Shape, { strokeWidth: 3, stroke: '#424242' }))  // the gray link shape
    
        // here's the family data
        var nodeDataArray = dom
    
        // create the model for the family tree
        myDiagram.model = new go.TreeModel(nodeDataArray)
    
        document.getElementById('zoomToFit').addEventListener('click', function() {
          myDiagram.commandHandler.zoomToFit()
        })
    
        document.getElementById('centerRoot').addEventListener('click', function() {
          myDiagram.scale = 1
          myDiagram.scrollToRect(myDiagram.findNodeForKey(0).actualBounds)
        })
    })
  }