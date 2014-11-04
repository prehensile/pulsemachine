
PulseListener = function( beatThreshold, dummyBPM ){ this.init( beatThreshold, dummyBPM ); }
$.extend( PulseListener.prototype, {

  beatInterval: 0,
  beatThreshold: 3.0,
  timeLastBeat: 0,
  lastValue: 0,
  valueSmoothing: 0.1,
  maxValue: 0,
  minValue: 0,
  bpm: 0,
  intervalSmoothing: 0.5,
  isTracking: false,
  intervalCache: [],
  intervalCacheLength: 20,
  sprite: null,
  isBeat: false,
  isHigh: false,
  isDummy: false,
  
  init: function( threshold, dummyBPM ){
    this.beatThreshold = threshold;
    this.isBeat = false;
    this.isHigh = false;
    this.isDummy = dummyBPM > 0;
    if( this.isDummy ) {
      this.bpm = dummyBPM;
      this.beatInterval = (dummyBPM/60) * 1000;
    }
  },

  logValue : function( valueIn ){
    
    // console.log( "logValue: ", valueIn );

    if( this.isBeat )
    {
      this.isBeat = false;
    }

    //var thisValue = this.smoothedValue( valueIn, this.lastValue, 0.1 );
    var thisValue = valueIn;
    var thisTime = new Date().getTime();

    // keep track of max val
    if( thisValue > this.maxValue) {
      this.maxValue = thisValue;
    }
    
    var isHighThisTime = ( thisValue > this.beatThreshold );

    if( !this.isHigh && isHighThisTime )
    {
      this.isTracking = true;
      this.isBeat = true;
      if( this.timeLastBeat > 0 )
      {
        this.beatInterval = thisTime - this.timeLastBeat;
      }
      this.timeLastBeat = thisTime;
    }

    this.lastValue = thisValue;
    this.isHigh = isHighThisTime;
    return this.isBeat;
  },

  averageValue: function( arrIn ) {
    var total = 0;
    var l = arrIn.length;
    for (var i = l-1; i >= 0; i--) {
      total += arrIn[i];
    };
    return total / l;
  },

  smoothedValue: function( newValue, oldValue, smoothing ){
    var val = (oldValue*this.smoothing) + (newValue*(1.0-this.smoothing));
    if( isNaN(val) ) val = newValue;  
    return val;
  },

  normalisedValue: function(){
    if( this.lastValue != 0 )
      return (this.lastValue / this.maxValue);
    return 0;
  },

  lastDisplayedBeatTime: 0,
  shouldDisplayBeat: function( time ) {
    var shouldBeat = false;
    if( this.beatInterval > 0 ) {
      var elapsed = time - this.lastDisplayedBeatTime;
      if( elapsed > this.beatInterval ) {
        this.lastDisplayedBeatTime = time;
        shouldBeat = true;
      }
    }
    return shouldBeat;
  },

  displayedValueForTime: function( time ){
    var outVal = 0;
    if( this.isTracking )
    {
      d = ((this.bpm / 60) * 1000)/2;
      t = time-this.lastDisplayedBeatTime;
      if( t>d) t = d;
      return this.easeOutBack( t, 1.0, -1.0, d, 1.7 );
    }
    return outVal;
  },

  easeOutBack: function (t, b, c, d, s) {
    if (s == undefined) s = 1.70158;
    return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
  },

});

initWidgets = function(){
  $( "#sldXfade" ).slider();
  $( "#bankA" ).selectmenu();
  $( "#bankB" ).selectmenu();
}

initSound = function(){
  $.getJSON( "/static/soundbanks.json", function( json ){
    var banks = json[ "sound_banks" ];
    for(var bankKey in banks ) {
      var thisBank = banks[bankKey ];
      for( var soundKey in thisBank ) {
        var soundId = thisBank[ soundKey ];
        createjs.Sound.registerSound( "/static/"+soundId+".ogg", soundId );
      }
    };
  });
}

easeInOutExpo = function (t, b, c, d) {
    if (t==0) return b;
    if (t==d) return b+c;
    if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
    return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
  }

easeInOutQuad = function (t, b, c, d) {
    if ((t/=d/2) < 1) return c/2*t*t + b;
    return -c/2 * ((--t)*(t-2) - 1) + b;
  },

playSoundForListenerIndex = function( index ){
  console.log( 'playSoundForListenerIndex', index );
  index++;
  var idSoundA = $( "#bankA" ).val() + "_" + index;
  var idSoundB = $( "#bankB" ).val() + "_" + index;
  var xfade = $( "#sldXfade" ).slider( "value" ) / 100.0;
  console.log(  idSoundA, idSoundB, xfade );
  if( xfade < 1.0 ) {
    var ins = createjs.Sound.play( idSoundA );
    ins.volume = easeInOutQuad( xfade, 1.0, -1.0, 1.0 );
  }
  if( xfade > 0.0 ) {
    var ins = createjs.Sound.play( idSoundB ); 
    ins.volume = easeInOutQuad( xfade, 0.0, 1.0, 1.0 );
  }
}

var ws;
var lastDate = Date.now()
var vals = [];
var fps = 0;
var pts = [];
var maxVals = [];

initWebsocket = function(){
  var addr = "ws://" + window.location.host + "/ws";        
  var ws = new WebSocket( addr );
  var username = "User" + parseInt( Math.random() * 1000 );

  window.onbeforeunload = function(e) {

    ws.close(1000, username + " left the room");

    if(!e) e = window.event;
    e.stopPropagation();
    e.preventDefault();
  };

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
}

$(function(){

  var rs = function() {
      var canvas = document.getElementById("mainCanvas");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
  }
  window.onresize = rs;
  rs();

  var dummyMode = true;

  if( !dummyMode ) {
    initWebsocket();
  }
  initWidgets();
  initSound();

  var stage = new createjs.Stage("mainCanvas");

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
  var listeners = [];
  var sprites = [];

  // tick handler
  var handleTick = function() {

    var thisTime = new Date().getTime();
    var stageWidth = stage.canvas.width;
    var stageHeight = stage.canvas.height;

    lines.graphics.clear();
    lines.graphics.beginFill( "rgba(0,0,0,0.02)" );
    lines.graphics.drawRect( 0, 0, stageWidth, stageHeight );
    lines.graphics.endFill();
    lines.graphics.setStrokeStyle(5, "round", "round");
    
    traceX -= traceInc;
    if( traceX < 0 ) {
      pts = [];
      stage.clear();
      traceX = stageWidth;
    }

    if( dummyMode ) {
      vals = [0,0];
    } 
    numLines = vals.length;
    
    var lineHeight = stageHeight / (numLines+2);

    while( listeners.length < numLines ) {
      var dummyBPM = 0;
      if( dummyMode ) {
        dummyBPM = (Math.random() * 40) + 60;
      }
      var listener = new PulseListener( 3.0, dummyBPM );
      listeners.push( listener );
    }

    var thisPoints = [];
    for (var i =0; i < numLines; i++) {
      var baseline = (lineHeight*(i+1));
      var listener = listeners[i];
      var beat = listener.logValue( vals[i] );
      var thisY = baseline;

      beat = listener.shouldDisplayBeat( thisTime );
      if(beat) {
          console.log( "beat!" );
          playSoundForListenerIndex( i );
      }

      thisY = baseline - (listener.normalisedValue()*lineHeight*0.8);
      thisPoints.push( [ traceX, thisY ] );
    };

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