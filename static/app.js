
PulseListener = function( beatThreshold ){ this.init( beatThreshold ); }
$.extend( PulseListener.prototype, {

  beatInterval: 0,
  beatThreshold: 3.0,
  timeLastBeat: 0,
  lastValue: 0,
  valueSmoothing: 0.1,
  isHigh: false,
  maxValue: 0,
  minValue: 0,
  bpm: 0,
  intervalSmoothing: 0.5,
  isTracking: false,
  intervalCache: [],
  intervalCacheLength: 20,
  sprite: null,
  valueCache: [],
  valueCacheLength: 10,

  init: function( threshold ){
    this.beatThreshold = threshold;
  },

  logValue : function( valueIn ){
    
    //console.log( valueIn );
    //console.log(  valueIn / this.lastValue );

    var isBeat = false;
    //var thisValue = this.smoothedValue( valueIn, this.lastValue, 0.1 );
    var thisValue = valueIn;
    var thisTime = new Date().getTime();

    this.valueCache.push( thisValue );
    if( this.valueCache.length > this.valueCacheLength ) this.valueCache.shift();

    // keep track of max val
    if( thisValue > this.maxValue) {
      this.maxValue = thisValue;
    }
    
    var stopTracking = false;
    // if( self.isTracking )
    // {
    //     stopTracking = true;
    //     for (var i = this.valueCache.length - 1; i >= 0; i--) {
    //       var val = this.valueCache[i];
    //       if( val < 4.4 ) stopTracking = false;
    //     }
    // }

    //console.log( stopTracking );

    // log beats
    if( thisValue > this.beatThreshold )
    {
      if( !this.isHigh ) {
        this.isHigh = true;
        isBeat = true;
      }
    }
    else
    {
      if( this.isHigh ) {
        this.isHigh = false;
      }

      if( this.isTracking && (this.beatInterval>0) )
      {
        // if we haven't gone over the tracking threshold for a while, stop tracking
        if( (thisTime-this.timeLastBeat) > this.beatInterval*4 )
        {
          stopTracking = true;
        }
      }
    }

    if( isBeat )
    {
      if( this.timeLastBeat > 0 )
      {
        var timeSinceLastBeat = thisTime - this.timeLastBeat;
        if( (this.beatInterval == 0) || (timeSinceLastBeat>(this.beatInterval/2)) )
        {
          if( this.beatInterval > 0 )
          {
            this.beatInterval = this.smoothedValue( timeSinceLastBeat, this.beatInterval, 0.5 );
            //this.beatInterval = timeSinceLastBeat;
          }
          else
          {
            this.beatInterval = timeSinceLastBeat;
          }

          //this.intervalCache.push( this.beatInterval );
          //if( this.intervalCache.length > this.intervalCacheLength ) this.intervalCache.shift()
          //this.beatInterval = this.averageValue( this.intervalCache );

          var bpm = (this.beatInterval / 1000) * 60;
         // this.bpm = this.smoothedValue( bpm, this.bpm, 0.9 );
          this.bpm = bpm;
          console.log( "bpm", bpm );
          this.isTracking = true;
        }
      }
      this.timeLastBeat = thisTime;
    }

    if( stopTracking )
    {
      console.log( "stopTracking" ); 
      this.isTracking = false;

      this.intervalCache = [];
      this.timeLastBeat = 0;
      this.beatInterval = 0;
      thisValue = 0;
      this.valueCache = [];
      this.lastDisplayedBeatTime = 0;
    }

    this.lastValue = thisValue;
    return isBeat;
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
    return (this.lastValue / this.maxValue);
  },

  lastDisplayedBeatTime: 0,

  shouldDisplayBeat: function(){
    
    if( this.beatInterval <= 0 )
    {
      return false
    }

    var shouldDisplay = false;
    var thisTime = new Date().getTime();
    
    if( (this.lastDisplayedBeatTime==0) && (this.bpm>0) )
    {
      this.lastDisplayedBeatTime = thisTime;
    }

    if( (thisTime - this.lastDisplayedBeatTime) >= this.beatInterval )
    {
      shouldDisplay = true;
      this.lastDisplayedBeatTime = thisTime;
    }

    //console.log( "shouldDisplay", shouldDisplay );

    return shouldDisplay;
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

    var numLines = vals.length;
    var lineHeight = stageHeight / (numLines+2);

    while( listeners.length < numLines ) {
      var listener = new PulseListener( 3.0 );
      listeners.push( listener );
      
      // var sp = new createjs.Bitmap( "/static/heart.png" );
      // sp.scaleX = sp.scaleY - 0.5;
      // stage.addChild( sp );
      // sprites.push( sp );
      // console.log( "new sprite");
    }

    var thisPoints = [];
    for (var i =0; i < numLines; i++) {
      var baseline = (lineHeight*(i+1));
      var listener = listeners[i];
      var beat = listener.logValue( vals[i] );
      var thisY = baseline;

      // var sprite = sprites[i];
      //   lines.graphics.beginFill( "black" );
      //   var b = sprite.getBounds();
      //   if( b )
      //   {
      //     lines.graphics.drawRect( b.x, b.y, b.width, b.height );
      //     lines.graphics.endFill();
      //   }

      if( listener.isTracking )
      {
        // sprite.visible = true;
        // sprite.x = traceX;
        // sprite.y = baseline - lineHeight + sprite.height;
        // sprite.alpha = listener.normalisedValue();

      //var beat = listener.shouldDisplayBeat();
      // thisY = baseline - (listener.displayedValueForTime( thisTime )*lineHeight*0.8);
       thisY = baseline - (listener.normalisedValue()*lineHeight*0.8);

        if(beat) {
          var sid = "beep_" + (i+1);
          createjs.Sound.play( sid );
          //thisY = baseline - (lineHeight*0;
        }
      }
      else
      {
       // sprite.visible = false;
      }
     // var baseline = (lineHeight*(i+2));
      
      //var thisY = baseline + (listener.normalisedValue() * lineHeight);
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