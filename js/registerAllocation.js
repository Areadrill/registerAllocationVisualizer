$().ready(function(){

  let dot = 'digraph {v0 -- v1; v2 -- v7; v2 -- v5 --  v6 -- v2; v2 -- v3 -- v4 -- v2; v8 -- v9; v10 }';
  network = loadGraph(dot);

  //let temporaryDot = 'digraph {b -- c; b -- d; b -- e; b -- m; b -- k; c -- m; d -- m; d -- k; d -- j; e -- m; e -- f; e -- j; f -- m; f -- j; g -- k; g -- h; g -- j; h -- j; j -- k; j -- b [dashes=true, color=black]; d -- c [dashes=true, color=black]}';
  //network = loadGraph(temporaryDot);
  logMessage("Default graph loaded.");

  console.log(interferences);


  let speed = $("#speed").val();
  $("#speedVal").text(speed);

  $("#resetBtn").click(function(){
    logMessage("Reset algorithm");
    reset();
  });

  $("#playBtn").click(function(){
    playing = !playing;
    if(playing){
      logMessage("Steps running automatically");
    }
    $("#playBtn").text((playing)?"Stop":"Run");
    play();
  });

  $("#speed").change(function(){
    $("#speedVal").text($("#speed").val());
  });

  $("#dotFile").change(function(){
    const fInput = $("#dotFile"); //should only be one
    if(checkFileExtension(fInput.val())){
      processFile(fInput[0].files[0]);
      reset();
    }
    else{
      console.error("Please provide a dot file");
      logMessage("The provided file is not a .dot file. Please provide a .dot file.");
    }
  });

  $("#stepBtn").click(function(){
    step();
  });
})

let nodes;
let edges;
let graph;
let interferences;
let stack = [];
let mode = "stackAdd";
let playing = false;

function play(){
  if(playing && mode !== "done"){
    step();
    setTimeout(play, 1000-($("#speed").val()*100));
  }
}

function reset(){
  resetStack();
  mode="stackAdd";
  playing = false;
  $("#playBtn").text("Run");
}

const colors = {
  yellow: {
    id: "yellow",
    background: 'yellow',
    border: 'black',
    highlight: {
      background: 'white',
      border: 'black'
    }
  },

  blue: {
    id: "blue",
    background: 'LightSeaGreen',
    border: 'black',
    highlight: {
      background: 'white',
      border: 'black'
    }
  },

  green: {
    id: "green",
    background: 'lightgreen',
    border: 'black',
    highlight: {
      background: 'white',
      border: 'black'
    }
  },

  red: {
    id: 'red',
    background: 'tomato',
    border: 'black',
    highlight: {
      background: 'white',
      border: 'black'
    }
  },

  pink: {
    id: "pink",
    background: 'pink',
    border: 'black',
    highlight: {
      background: 'white',
      border: 'black'
    }
  },

  brown: {
    id: "brown",
    background: 'brown',
    border: 'black',
    highlight: {
      background: 'white',
      border: 'black'
    }
  },

  orange: {
    id: "orange",
    background: 'orange',
    border: 'black',
    highlight: {
      background: 'white',
      border: 'black'
    }
  },

  purple: {
    id: "purple",
    background: 'purple',
    border: 'black',
    highlight: {
      background: 'white',
      border: 'black'
    }
  }
}

function step(){
  switch(mode){
    case "stackAdd":
      if(checkStackAddDone(mode)){
        mode = "coloring";
        step()
        return;
      }

      let needSpill = true;
      let maxIndegree = 0;
      let maxId = "";
      try{
        //simplify
        nodes.forEach(function(el){
          inDeg = getIndegree(el.id);
          if(inDeg > maxIndegree){
            maxIndegree = inDeg
            maxId = el.id
          }
          console.log("k: " + $("#k").val());
          if(stack.indexOf(el.id) === -1 && inDeg < $("#k").val() && !isMoveRelated(el.id)){
            console.log("lol");
            addToStack(el.id);
            throw {name: "Step Done", level: "Show stopper", message: "Step is done"}
          }
        });

        //coalesce


        //freeze
      }
      catch(done){
        //console.log("Step done");
        needSpill = false;
      }

      if(needSpill){
        addToStack(maxId, needSpill);
      }
      break;
    case "coloring":
      node = stack.pop();
      $("#stack li:first-child").remove();
      colours = getNeighboringColors(node);
      let cnt = 0;
      for(c in colors){
        //console.log(node + " " + cnt);
        if(colours.indexOf(c) === -1){
          setColor(node, c);
          solidifyEdgeNodes(node);
          break;
        }
        ////console.log(cnt+1);
        ////console.log($("#k").val());
        //console.log(nodes.get(node).maySpill);
        if(++cnt == $("#k").val() && nodes.get(node).maySpill){
          logMessage(node + " spilled");
          return;
        }
      }
      if(stack.length == 0){
        mode = "done";
        if(playing){
          playing = !playing;
        }
      }
      break;

    default:
      break;
  }
}

function checkStackAddDone(){
  try{
    nodes.forEach(function(el){
      if(stack.indexOf(el.id) === -1){
        throw {name: "Step Done", level: "Show stopper", message: "Step is done"}
      }
    })
  }
  catch(done){
    return false;
  }
  return true;
}

function addToStack(id, spill=false){
  if(stack.indexOf(id) !== -1){
    console.error("Node already in stack");
    return false;
  }
  edges.forEach(function(el){
    if(el.from === id || el.to === id){
      edges.update({id: el.id, from: el.from, to: el.to, dashes: true});
    }
  });

 
  if(!spill){
    nodes.update({id: id, label: id, shapeProperties: {borderDashes: [5, 5]}})
    $("#stack").prepend("<li class=\"list-group-item\">" + id + "</li>");
  }
  else{
    nodes.update({maySpill: true, id: id, label: id, shapeProperties: {borderDashes: [5, 5]}})
    $("#stack").prepend("<li class=\"list-group-item\">" + id + "may-spill" + "</li>");
  }
  stack.push(id);
  return true;
}

function isMoveRelated(id){
  try{
    edges.forEach(function(el){
      //console.log(el.color);
      if((el.to === id || el.from === id) && el.color){
        throw {name: "Is move-related", level: "Show stopper", message: "Node is move-related"}
      }
    });
    return false;
  }
  catch(e){
    return true;
  }
}

function resetStack(){
  stack = [];
  edges.forEach(function(el){
    edges.update({id: el.id, from: el.from, to: el.to, dashes: false});
  });
  nodes.forEach(function(el){
    nodes.update({color: '#97C2FC', id: el.id, label: el.id, shapeProperties: {borderDashes: [0, 0]}});
  });
  $("#stack").html("");
}

function solidifyEdgeNodes(id){
  edges.forEach(function(el){
    if(el.from === id || el.to === id){
      edges.update({id: el.id, from: el.from, to: el.to, dashes: false});
    }
  });
  nodes.update({id: id, label: id, shapeProperties: {borderDashes: [0, 0]}})

}

function getNeighboringColors(id){
  colours = [];
  edges.forEach(function(el){
    if(el.from === id){
      if(nodes.get(el.to).color){
        colours.push(nodes.get(el.to).color.id);
      }
    }
    else if(el.to === id){
      if(nodes.get(el.from).color){
        colours.push(nodes.get(el.from).color.id);
      }
    }
  });
  return colours;
}

function setColor(id, color){
  if(colors[color]){
    nodes.update({id: id, label: id, color: colors[color]});
  }
  else{
    console.error("The specified color is not defined");
  }
}

function getColor(id){
  return nodes.get(id).color.id;
}

function getIndegree(id){
  let deg = 0;
  edges.forEach(function(el){
    if((el.from === id || el.to === id) && !el.dashes){
      deg++;
    }
  });
  return deg;
}

function getConnections(){
  edges.forEach(function(el){
    if(interferences[el.to] === undefined){
      interferences[el.to] = [el.from];
    }
    else{ 
      interferences[el.to].push(el.from);
    }

    if(interferences[el.from] === undefined){
      interferences[el.from] = [el.to];
    }
    else{
      interferences[el.from].push(el.to);
    }
  });
}

function checkFileExtension(path){
  return path.split(".")[1] === "dot";
}

function processFile(file){
  const fReader = new FileReader();
  fReader.onload = function(e){
    loadGraph(e.target.result)
  }
  return fReader.readAsText(file);
}

function loadGraph(dot){
  let container = $("#graph")[0]; //should only be one
  let parsedData = vis.network.convertDot(dot);
  let data = {
    nodes: new vis.DataSet(parsedData.nodes),
    edges: new vis.DataSet(parsedData.edges)
  }

  let options = {};
  graph =  new vis.Network(container, data, options);
  nodes = data.nodes;
  edges = data.edges;
  interferences = [];
  getConnections();
}

function logMessage(txt){
  $("#messages").append("<br><p>"+txt+"</p>");
}
