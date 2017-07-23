let dot = 'digraph {v0 -- v1; v2 -- v7; v2 -- v5 -- v6 -- v2; v2 -- v3 -- v4 -- v2; v8 -- v9; v10 }';
$().ready(function(){
  network = loadGraph(dot);
  logMessage("Default graph loaded.");

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
  if($("#dotFile").val() === ""){
   network = loadGraph(dot); 
  }
  else if(checkFileExtension($("#dotFile").val())){
    processFile($("#dotFile")[0].files[0]);
  }
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
          if(inDeg > maxIndegree && !isMoveRelated(el.id)){
            maxIndegree = inDeg
            maxId = el.id
          }
          //console.log("k: " + $("#k").val());
          if(stack.indexOf(el.id) === -1 && inDeg < $("#k").val() && !isMoveRelated(el.id)){
            addToStack(el.id);
            throw {name: "Step Done", level: "Show stopper", message: "Step is done"};
          }
        });

        //coalesce
        let coalescingNodes = getCoalescingOption();
        if(coalescingNodes){
          coalesce(coalescingNodes[0], coalescingNodes[1]);
          throw {name: "Step Done", level: "Show stopper", message: "Step is done"};
        } 

        //freeze
        let freezeEdge = getFreezeOption();
        if(freezeEdge){
          logMessage("Froze move " + edges.get(freezeEdge).from + " - " + edges.get(freezeEdge).to);
          edges.remove(freezeEdge);
          throw {name: "Step Done", level: "Show stopper", message: "Step is done"};
        }

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

function coalesce(id1, id2){
  const simEdges = simulateIndegree(id1, id2);
  nodes.remove({id: id1});
  nodes.remove({id: id2});
  nodes.add({id: id1 + "-" + id2, label: id1 + "-" + id2});

  edges.forEach(function(el){
    if(el.to === id1 || el.to === id2 || el.from === id1 || el.from === id2){
      edges.remove({id: el.id});
    }
  });
  
  for(let i = 0; i < simEdges.interferences.length; i++){
    console.log(i + "/" + simEdges.interferences.length + " - " + simEdges.interferences[i]);
    if(stack.indexOf(simEdges.interferences[i]) === -1){
      edges.add({id: id1 + "-" + id2 + "--" + simEdges.interferences[i], from: id1 + "-" + id2, to: simEdges.interferences[i], arrows: undefined});
    }
    else{
      edges.add({id: id1 + "-" + id2 + "--" + simEdges.interferences[i], from: id1 + "-" + id2, to: simEdges.interferences[i], arrows: undefined, dashes: true});
    }
  }
  console.log(simEdges.interferences);
  console.log(edges);
  getConnections();
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

function getFreezeOption(){
  try{
    edges.forEach(function(el){
      if(el.dashes && el.color){
        let k = $("#k").val();
        if(getIndegree(el.from) < k || getIndegree(el.to) < k){
          throw {name: "Found option", level: "Show stopper", message:el.id};
        }
      }
    });
  }
  catch(e){
    return e.message;
  }
}

function getCoalescingOption(){
  try{
    edges.forEach(function(el){
      if(el.dashes && el.color){
        console.log("Considering " + el.from + " and " + el.to);
         if(isCoalescable(el.from, el.to)){
          throw {name: "Found option", level: "Show stopper", message:el.from + " " + el.to};
        }
      }
    });
  }
  catch(e){
    return e.message.split(" ");
  }
}

function isCoalescable(id1, id2){
  let simulatedEdges = simulateIndegree(id1, id2);

  if($("input[name='coalescingOpt']:checked").val() === "Briggs"){
    return isBriggsCoalescable(simulatedEdges.inDegree);
  }
  else{
    return isGeorgeCoalescable(id1, id2);
  }
}

function isBriggsCoalescable(inDeg){
  return inDeg < $("#k").val();
}

function isGeorgeCoalescable(id1, id2){
  neighborsInterfere = true;
  lowDegreeNeighbors = true;
  for(let i = 0; i < interferences[id1]; i++){
    if(!neighborsInterfere && !lowDegreeNeighbors){
      return false;
    }

    if(neighborsInterfere && $.grep(interferences[interferences[id1][i].id], function(e){e.id === id2}).length === 0){
      neighborsInterfere = false;
    }
    if(getIndegree(lowDegreeNeighbors && interferences[id1][i].id) >= $("#k").val()){
      lowDegreeNeighbors = false;
    }
  }

  for(let i = 0; i < interferences[id2]; i++){
    if(!neighborsInterfere && !lowDegreeNeighbors){
      return false;
    }

    if(neighborsInterfere && $.grep(interferences[interferences[id2][i].id], function(e){ e.id === id1}).length === 0){
      neighborsInterfere = false;
    }
    if(getIndegree(lowDegreeNeighbors && interferences[id2][i].id) >= $("#k").val()){
      lowDegreeNeighbors = false;
    }
  }

  return neighborsInterfere || lowDegreeNeighbors;
}

function simulateIndegree(id1, id2){
  let inDeg = 0;
  let interferingNodes = [];
  for(let i = 0; i < interferences[id1].length; i++){
    if(interferences[id1][i].id !== id1 && interferences[id1][i].id !== id2){
      if(stack.indexOf(interferences[id1][i].id) === -1 && !interferences[id1][i].moveRelated){
        inDeg++
      }
      interferingNodes.push(interferences[id1][i].id);
    }
  }

  for(let j = 0; j < interferences[id2].length; j++){
    if(interferences[id2][j].id !== id1 && interferences[id2][j].id !== id2){
      if(interferingNodes.indexOf(interferences[id2][j].id) === -1 && stack.indexOf(interferences[id2][j].id) === -1 && !interferences[id1][j].moveRelated){
        inDeg++;
      }
      if(interferingNodes.indexOf(interferences[id2][j].id) === -1){
        interferingNodes.push(interferences[id2][j].id);
      }
      
    } 
  }
  //console.log(interferingNodes);
  return {inDegree: inDeg, interferences: interferingNodes};
}

function getConnections(){
  interferences = [];
  nodes.forEach(function(el){
    interferences[el.id] = [];
  });
  
  edges.forEach(function(el){  
    interferences[el.to].push(el.color?{"id": el.from, "moveRelated": true}:{"id": el.from});
    interferences[el.from].push(el.color?{"id": el.to, "moveRelated": true}:{"id": el.to});
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
  getConnections();
}

function logMessage(txt){
  $("#messages").append("<br><p>"+txt+"</p>");
}
