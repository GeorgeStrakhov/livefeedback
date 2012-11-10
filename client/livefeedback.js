Streams = new Meteor.Collection("streams");

////////// global reactive helpers ///////////
Handlebars.registerHelper("urlPart", function() {
  return Session.get("urlPart");
});

Handlebars.registerHelper("currentStream", function() {
  return Streams.findOne(Session.get("currentStream"));  
});

Handlebars.registerHelper("currentStreamStatus", function(status) { //current app state e.g. "creatingNewList" etc. used to show modals etc.
  return Streams.findOne(Session.get("currentStream")).status == status;
});

Handlebars.registerHelper("activePoint", function() {
  var currentStream = Streams.findOne(Session.get("currentStream"));
  for (i=0; i<currentStream.points.length; i++) {
    if (currentStream.points[i].isActive)
      return currentStream.points[i];
  }
});

Handlebars.registerHelper("myOwnStream", function() {
  return Session.get("myOwnStream");
});

Meteor.autosubscribe(function() {
  Meteor.subscribe("currentStream", Session.get("currentStream"));
  console.log('stream changed');
  var currentStream = Streams.findOne(Session.get("currentStream"));
  Session.set("myOwnStream", false);
  if(currentStream) {
    $.each(currentStream.owners, function() {
      if(this.toString() == Meteor.userId())// Meteor.user()._id
        Session.set("myOwnStream", true);
    });
    //walk through the points and if this stream is active and there is no active point & I'm the owner - then set the first point active
    if(Session.get("myOwnStream") && currentStream.status == "active") {
      var noActivePoint = true
      $.each(currentStream.points, function() {
        if(this.isActive == true)
          noActivePoint = false;
      });
      if(currentStream.points[0] && noActivePoint) {
        console.log('no active point. setting the first one');
        currentStream.points[0].isActive = true;
        Streams.update({_id: Session.get("currentStream")}, {$set: {points: currentStream.points}});
      }        
    }
  }
});

////////// global helper functions ////////////
function createStream(details) {
  return Streams.insert({
    name: details.name, 
    owners: (details.owners) ? details.owners : [Meteor.userId()],
    status: (details.status) ? details.status : "active",
    joiners: [],
    points: []
  });
};

function createPoint(details) {
  
  var newPoint = {
    timestamp: new Date(),
    content: (details.content) ? details.content : "?",
    isActive: (details.isActive) ? details.isActive : false,
    comments: [],
    thumbsUp: [],
    thumbsDown: []
  };
  
  Streams.update({_id: Session.get("currentStream")}, {$push: {points: newPoint}});  
  
};

function addJoiner() {
  if(Session.get("currentStream")) {
    Streams.update({_id: Session.get("currentStream")},{$addToSet: {joiners: Meteor.userId()}});
  } else {
    alert("error! no current stream!");
  }
};

function setActivePoint(which) { //which can be "next", "prev" or "rand"
  console.log("not ready yet!");
  /* FIX!
  var points = Streams.findOne(Session.get("currentStream")).points;
  $.each(Streams.findOne(Session.get("currentStream")).points, function(i) {
    console.log(i);
    //Streams.update({_id: Session.get("currentStream")}, {$set: {points[i].isActive: false}});
  }); //setting every point to passive
  
  if(which == "rand") {
    //random point!
  }
  $.each(points, function() {
    if(this.isActive) {
      console.log("active point!");
    }
  });
  */
};

////////// Template specific behavior ////////////

Template.myStreams.allStreams = function() {
  var allStreams = Streams.find({owners: {$all: [Meteor.userId()]}}).fetch(); //should match if current use is one of the owners
  return allStreams;
};

Template.myStreams.events = {
  'click #createNewStream' : function() {
    $("#newStreamCreate").toggle();
    $("#newStreamName").focus();
  },
  'click #createNewStreamBtn' : function() {
    if($("#newStreamName").val()!="") {
      createStream({
        name: $("#newStreamName").val(),
        owners: [Meteor.userId()],
      });
      $("#newStreamCreate").toggle();
    } else {
      alert("please put in a name");
    }
  },
  'click #joinStream' : function() {
    $("#joinStreamForm").toggle();
    $("#joinStreamName").focus();    
  },
  'click #joinStreamBtn' : function() {
    if($("#joinStreamName").val() != "") {
      var streamIAmJoining = Streams.findOne({name: $("#joinStreamName").val()});
      //console.log(streamIAmJoining);
      if (streamIAmJoining && streamIAmJoining._id) {
        //console.log(streamIAmJoining._id);
        Router.navigate("stream/"+streamIAmJoining._id, true);
        addJoiner();
      } else {
        alert("sorry, there is no stream with such name"); 
      }
    } else {
      alert("please enter the name of the stream!");
    }
  },
};

Template.singleStreamItem.joinersCount = function() {
  return this.joiners.length;
};

Template.ownerView.events = {
  'click #newPointBtn' : function() {
    createPoint({
      content: $("#newPointContent").val(),
    });
  },
};

////////// Tracking selected stream in URL //////////

var StreamsRouter = Backbone.Router.extend({
  routes: {
    "stream/:streamId": "stream",
    "": "main",
    "myStreams": "main",
    "*stuff": "main"
  },
  main: function(stuff) {
    Session.set("urlPart", false);
  },
  stream: function (streamId) {
    Session.set("currentStream", streamId);
    Session.set("urlPart", true);
  },
  setStream: function (streamId) {
    this.navigate("stream/".streamId, true);
  }
});

Router = new StreamsRouter;

Meteor.startup(function () {
  Backbone.history.start();//{pushState: true});
});
