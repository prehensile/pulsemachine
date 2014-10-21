
$(function(){

  var addr = "ws://" + window.location.host + "/ws";        
  var ws = new WebSocket( addr );
  var username = "User" + parseInt( Math.random() * 1000 );

  window.onbeforeunload = function(e) {

    ws.close(1000, username + " left the room");

    if(!e) e = window.event;
    e.stopPropagation();
    e.preventDefault();
  };

  var rs = function() {
      var canvas = document.getElementById("mainCanvas");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
  }
  window.onresize = rs;
  rs();

  var stage = new createjs.Stage("mainCanvas");

  var lastDate = Date.now()
  var vals = [];
  var fps = 0;
  var pts = [];
  var maxVals = [];

  ws.onmessage = function (evt) {

    now = Date.now();
    elapsed = now - lastDate;
    fps = 1000 / elapsed;

     // $("#chat").val( fps + "fps //" + evt.data );

     vals = JSON.parse( evt.data );

    while( vals.length > maxVals.length ) {
      maxVals.push( 0 );
    }

     for (var i = vals.length - 1; i >= 0; i--) {
       var mv = maxVals[i];
       var v = vals[i];
       if( mv < v ) mv = v;
       maxVals[i] = mv;
     }

     lastDate = now;
  };

  // set up sounds
  createjs.Sound.registerSound("/static/beep_1.ogg", "beep_1");
  createjs.Sound.registerSound("/static/beep_2.ogg", "beep_2");
  createjs.Sound.registerSound("/static/beep_3.ogg", "beep_3");
  createjs.Sound.registerSound("/static/beep_4.ogg", "beep_4");
  createjs.Sound.registerSound("/static/beep_5.ogg", "beep_5");

  // set up Shape instance we'll be using to draw traces
  var lines = new createjs.Shape();
  stage.addChild( lines );
  stage.autoClear = false;
  
  // some drawing constants
  var traceX = stage.canvas.width;
  var traceInc = 2;
  var bounced = null;
  var colors = [ "#ce4346", "#ddbe32", "#99813e", "#a1bbb2", "#e3d4b8" ];
  //var colors = [];

  // tick handler
  var handleTick = function() {

    var stageWidth = stage.canvas.width;
    var stageHeight = stage.canvas.height;

    lines.graphics.clear();
    lines.graphics.beginFill( "rgba(0,0,0,0.02)", "round", "round" );
    lines.graphics.drawRect( 0, 0, stageWidth, stageHeight );
    lines.graphics.endFill();
    lines.graphics.setStrokeStyle(5);
    
    traceX -= traceInc;
    if( traceX < 0 ) {
      pts = [];
      stage.clear();
      traceX = stageWidth;
    }

    var numLines = vals.length;

    var lineHeight = stageHeight / (numLines+2);

    var thisPoints = [];
    var thisBounced = [];
    for( var i=0; i<numLines; i++ ){
      var val = vals[i];
      var pc = val / maxVals[i];
      if( isNaN(pc) ) pc = 0;
      var baseline = (lineHeight*(i+2));
      var thisY =  baseline - (lineHeight*pc);
      thisPoints.push( [ traceX, thisY ] );
      thisBounced.push( val > 3.0 );
    }

    if( bounced ) {
      for (var i = bounced.length - 1; i >= 0; i--) {
        var thatBounce = bounced[i];
        var thisBounce = thisBounced[i];
        if( thisBounce && (thisBounce != thatBounce) ) {
          var sid = "beep_" + (i+1);
          createjs.Sound.play( sid );
        }
      };
    }
    bounced = thisBounced;

    if( pts.length > 0 ) {
      for( var j=0; j<thisPoints.length; j++ ) {
        var thisPoint = thisPoints[j];
        var lastPoint = pts[j];
        var color = colors[j];
        lines.graphics.beginStroke( color );
        lines.graphics.moveTo( lastPoint[0], lastPoint[1] );
        lines.graphics.lineTo( thisPoint[0], thisPoint[1] );
      }

    }

    pts = thisPoints;

    stage.update();

     $("#fps").text( fps + "fps" );
  };

  createjs.Ticker.addEventListener( "tick", handleTick );
  /*
  ws.onopen = function() {
     ws.send( username + " entered the room");
  };
  
  ws.onclose = function(evt) {
     $("#chat").val($("#chat").val() + "Connection closed by server: " + evt.code + " \'" + evt.reason + "\'\n");
  };

  $("#send").click(function() {
     console.log($("#message").val());
     ws.send( username + ": " + $("#message").val());
     $("#message").val("");
     return false;
  });*/

});