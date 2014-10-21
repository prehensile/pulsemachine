
$(function(){

  var addr = "ws://" + window.location.host + "/ws";        
  var ws = new WebSocket( addr );
  var username = "User" + parseInt( Math.random() * 1000 );

  var stage = new createjs.Stage("mainCanvas");

  window.onbeforeunload = function(e) {

    ws.close(1000, username + " left the room");

    if(!e) e = window.event;
    e.stopPropagation();
    e.preventDefault();
  };

  var lastDate = Date.now()
  var vals = [];
  var fps = 0;
  var pts = [];

  ws.onmessage = function (evt) {

    now = Date.now();
    elapsed = now - lastDate;
    fps = 1000 / elapsed;

     // $("#chat").val( fps + "fps //" + evt.data );

     vals = JSON.parse( evt.data );

     lastDate = now;
  };

  // set up sounds
  createjs.Sound.registerSound("/static/beep.ogg", "beep");

  // set up Shape instance we'll be using to draw traces
  var lines = new createjs.Shape();
  stage.addChild( lines );
  stage.autoClear = false;

  // some drawing constants
  var traceX = 960;
  var traceInc = 2;
  var traceScale = 50;
  var bounced = null;

  // tick handler
  var handleTick = function() {
    
    lines.graphics.clear();
    // lines.graphics.setStrokeStyle(3);
    lines.graphics.beginStroke("red");

    traceX -= traceInc;
    if( traceX < 0 ) {
      pts = [];
      stage.clear();
      traceX = 960;
    }

    var thisPoints = [];
    var thisBounced = [];
    for( var i=0; i<vals.length; i++ ){
      var val = vals[i];
      thisPoints.push( [ traceX, 300 - (val*traceScale) ] );
      thisBounced.push( val > 3.0 );
    }

    if( bounced ) {
      for (var i = bounced.length - 1; i >= 0; i--) {
        var thatBounce = bounced[i];
        var thisBounce = thisBounced[i];
        if( thisBounce && (thisBounce != thatBounce) ) {
          createjs.Sound.play("beep");
        }
      };
    }
    bounced = thisBounced;

    if( pts.length > 0 ) {

      for( var j=0; j<thisPoints.length; j++ ) {
        var thisPoint = thisPoints[j];
        var lastPoint = pts[j];
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