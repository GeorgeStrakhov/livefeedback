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
    addJoiner();
    $.each(currentStream.owners, function() {
      if(this.toString() == Meteor.userId())// Meteor.user()._id
        Session.set("myOwnStream", true);
    });
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

function uniqueStreamName(newName) {
  return Streams.findOne({name: newName});
};

function createPoint(details) {
  if (typeof details.isActive != 'undefined') {
    makeAllPointsInActive();
  };
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
  if(Meteor.userLoaded()) {
    if(Session.get("currentStream")) {
      var notAJoiner = true;
      var notAnOwner = true;
      var currentStream = Streams.findOne(Session.get("currentStream"));
      $.each(currentStream.owners, function() {
        if(this.toString() == Meteor.userId())
          notAnOwner = false;
      });
      $.each(currentStream.joiners, function() {
        if(this.toString() == Meteor.userId())
          notAJoiner = false;
      });
      if(notAJoiner && notAnOwner) {
        Streams.update({_id: Session.get("currentStream")},{$addToSet: {joiners: Meteor.userId()}});
      }
    } else {
      alert("error! no current stream!");
    }
  }
};

function editPoint(point, details) {
  var allPoints = getCurrentStreamPoints();
  $.each(allPoints, function(i){
    if (typeof details.isActive != 'undefined') {
      allPoints[i].isActive = false;
    };
    if (this.timestamp == point.timestamp) {
      $.each(details, function(attr) {
        allPoints[i][attr] = details[attr];
      });
    }
  });
  Streams.update({_id: Session.get("currentStream")},{$set: {points: allPoints}});
}

function getCurrentStreamPoints() { // just get all current points
  return Streams.findOne(Session.get("currentStream")).points;
}

function makeAllPointsInActive() {
  var allPoints = getCurrentStreamPoints();
  $.each(allPoints, function(i) {
    allPoints[i].isActive = false;
  });
  Streams.update({_id: Session.get("currentStream")},{$set: {points: allPoints}});
}

function makePointActive(point) { // shorthand for editPoint
  editPoint(point, {isActive: true});
}

function deletePoint(point) {
  var allPoints = getCurrentStreamPoints();
  $.each(allPoints, function(i){
    if (this.timestamp == point.timestamp) {
      allPoints.splice(i,1);
    }
  });
  Streams.update({_id: Session.get("currentStream")},{$set: {points: allPoints}});
}

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

Template.myStreams.noStreamsYet = function() {
  var allStreams = Streams.find({owners: {$all: [Meteor.userId()]}}).fetch(); //should match if current use is one of the owners
  return allStreams.length == 0;
};

Template.myStreams.rendered = function() {
  $(".joinersForStream").popover();
};

Template.myStreams.events = {
  'click #createNewStream' : function() {
    $("#newStreamCreate").toggle();
    $("#newStreamName").focus();
  },
  'click #createNewStreamBtn' : function() {
    if($("#newStreamName").val()!="") {
      if (!uniqueStreamName($("#newStreamName").val())) {
        createStream({
          name: $("#newStreamName").val(),
          owners: [Meteor.userId()],
        });
        $("#newStreamCreate").toggle();
      } else {
        alert("a stream with such name already exists! please chose a different one");
      }
    } else {
      alert("please put in a name");
    }
  },
  'click #joinStream' : function() {
    $("#joinStreamForm").toggle();
    $("#joinStreamName").focus();    
  },
  'mouseover .joinersForStream' : function() {
    $("#joinersCountForStream"+this._id).popover("show");
  },
  'mouseout .joinersForStream' : function() {
    $(".joinersForStream").popover("hide");
  },
  'click #joinStreamBtn' : function() {
    if($("#joinStreamName").val() != "") {
      var streamIAmJoining = Streams.findOne({name: $("#joinStreamName").val()});
      //console.log(streamIAmJoining);
      if (streamIAmJoining && streamIAmJoining._id) {
        //console.log(streamIAmJoining._id);
        Router.navigate("stream/"+streamIAmJoining._id, true);
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
Template.ownerView.rendered = function() {
  $('li.point').on({
    hover : function(){
      $(this).find('button').toggle();
    }
  });
};

Template.singleStreamItem.namesOfPeopleWhoJoined = function() {
  var names = "";
  $.each(this.joiners, function() {
  //console.log(this.toString());
    if(names != "")
      names +=", ";
    var nextName = Meteor.users.findOne(this.toString()).profile.name;
    names += nextName;
  });
  if (names == "")
    names = "nobody joined yet..."
  return names;
};

Template.ownerView.events = {
  'click #newPointBtn' : function() {
    if($("#newPointContent").val() == "") {
      alert('hey, stfu and put in a point');
      return false
    };
    createPoint({
      content: $("#newPointContent").val(),
    });
    $("#newPointContent").val('');
    $("#newPointContent").focus();
  },
  'click #newPointBtnAndActivate': function() {
    if($("#newPointContent").val() == "") {
      alert('hey, stfu and put in a point');
      return false
    };
    createPoint({
      content: $("#newPointContent").val(),
      isActive: true
    });
    $("#newPointContent").val('');
    $("#newPointContent").focus();
  },
  'keypress #newPointContent' : function(e) {
    if(e.keyCode == 13 ) $('#newPointBtn').trigger('click');
  },
  'click .delete' : function() {
    deletePoint(this);
  },
  'click .edit' : function(e) {
    var editButton = $(e.srcElement);
    var pointContent = editButton.parent().siblings('span.content');
    if(pointContent.has('textarea.pointEditor').length > 0) {
      editButton.text('edit');
      editPoint(this, {content: pointContent.find('textarea.pointEditor').val()}); 
    } 
    else {
      var currentHtml = pointContent.html();
      var input = $('<textarea type="text" class="pointEditor span2" rows="3"/>');
      input.keypress(function(e){
        if(e.keyCode == 13) 
          $(this).parent().find('.edit').trigger('click');
      });
      pointContent.html(input.val(currentHtml));
      editButton.text('submit');
    }
  }, 
  'click .makeActive' : function() {
    makePointActive(this);
  }
};

Template.singlePointTemplate.allThumbsUp = function() {
  return (this.thumbsUp.length == 0) ? '0' : '+'+this.thumbsUp.length.toString();
};
Template.singlePointTemplate.allThumbsDown = function() {
  return (this.thumbsDown.length == 0) ? '0' : '-'+this.thumbsDown.length.toString();
};
Template.singlePointTemplate.AllComments = function() {
  return (this.comments.length.toString() == '1') ? (this.comments.length.toString() + ' feedback') : (this.comments.length.toString() + ' feedbacks');
};
Template.singleModeratorsTemplate.owners = function() {
  return Meteor.users.findOne(this.toString()).profile.name;
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

// JQUERY SHIT
