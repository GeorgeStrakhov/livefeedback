Streams = new Meteor.Collection("streams");
Meteor.subscribe("streams");
Meteor.subscribe("directory");

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

Handlebars.registerHelper("invitation", function() {
  return Session.get("invitation");
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
    Session.set("tasksLoaded", true);
  }
});

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
  // if(Streams.findOne({_id: Session.get("currentStream")}).status == 'finished') {
  //   alert('First start stream');
  //   return false
  // }
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

Template.welcome.events = {
  'click #signInButton' : function(e) {
    e.preventDefault();
    Meteor.loginWithFacebook();
  },
  'click #learnMoreLink' : function(e) {
    e.preventDefault();
    $("#learnMoreDiv").toggle('slow');
  },
};

Template.signIn.events = {
  'click #signInButton' : function(e) {
    e.preventDefault();
    Meteor.loginWithFacebook();
  }
};

Template.invitation.events = {
  'click #signInButton' : function(e) {
    e.preventDefault();
    Meteor.loginWithFacebook(function() {
      Meteor.call('pendingOwnerJoined', Session.get("currentStream"), function(error, result) {
        if(error)
          alert(error.reason);
        if(result)
          console.log(result);
          Router.navigate("stream/"+Session.get("currentStream"), true);
      });
    });
  }
};

Template.myStreams.allStreams = function() {
  var allStreams = Streams.find({owners: {$all: [Meteor.userId()]}}).fetch(); //should match if current use is one of the owners
  return allStreams;
};
Template.myStreams.userName = function() {
  if(Meteor.userLoaded()) return Meteor.user().profile.name
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
        Meteor.call('createNewStream', $("#newStreamName").val(), function(error, result) {
          if(error)
            alert(error);
          if(result)
            console.log('new stream created!');
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
  'click #logoutButton': function() {
    Meteor.logout();
  }
};

Template.singleStreamItem.joinersCount = function() {
  return this.joiners.length;
};
Template.singleStreamItem.isActive = function() {
  return this.status == "active";
}
Template.ownerView.rendered = function() {
  $('li.point').on({
    hover : function(){
      $(this).find('div.btn-group').find('button').toggle();
    }
  });
};

Template.ownerView.shortUrl = function() {
  return Streams.findOne(Session.get("currentStream")).shortUrl;
};

Template.singleStreamItem.namesOfPeopleWhoJoined = function() {
  if(Meteor.userLoaded()) {
    var names = "";
    $.each(this.joiners, function() {
    //console.log(this.toString());
      if(names != "")
        names +=", ";
      //console.log(Meteor.users.findOne());
      if(Meteor.users.findOne(this.toString())) {
        var nextName = Meteor.users.findOne(this.toString()).profile.name;
        names += nextName;
      }
    });
    if (names == "")
      names = "nobody joined yet..."
    return names;
  }
};

Template.ownerView.events = {
  'click .viewFeedback' : function(e) {
    $(e.srcElement).siblings('.modal').modal('show');
  },
  'click #inviteOpenButton' : function() {
    $(".inviteModal").modal("show");
  },
  'click .navigatePoints' : function(e) {
    var currentPoints = getCurrentStreamPoints();
    var numberOfActivePoint;
    if($(e.srcElement).data('navigate') == 'up') {
      $.each(currentPoints, function(i){
        if(this.isActive) numberOfActivePoint = i;
      });
      if(currentPoints[numberOfActivePoint-1]) {
        makePointActive(currentPoints[numberOfActivePoint-1]);
      } 
      else {
          if(Streams.findOne({_id: Session.get("currentStream")}).status == 'active') {
            makeAllPointsInActive();
            Streams.update({_id: Session.get("currentStream")},{$set: {status: 'finished'}});
          } 
          else {
            return false;
          }     
      }
    } 
    else if ($(e.srcElement).data('navigate') == "down") {
      $.each(currentPoints, function(i){
        if(this.isActive) numberOfActivePoint = i;
      });
      if(currentPoints[numberOfActivePoint+1]) {
        makePointActive(currentPoints[numberOfActivePoint+1]);
      } 
      else {
          if(Streams.findOne({_id: Session.get("currentStream")}).status == 'active') {
            makeAllPointsInActive();
            Streams.update({_id: Session.get("currentStream")},{$set: {status: 'finished'}});
          } 
          else {
            return false;
          }     
      }
    } 
  },
  'click #newPointBtn' : function() {
    if($("#newPointContent").val() == "") {
      alert('put in a point');
      return false
    };
    createPoint({
      content: $("#newPointContent").val(),
    });
    $("#newPointContent").val('');
    $("#newPointContent").focus();
  },
  'click #newPointBtnAndActivate': function() {
    // if(Streams.findOne({_id: Session.get("currentStream")}).status == 'finished') {
    //   alert('First start stream');
    //   return false
    // }
    if($("#newPointContent").val() == "") {
      alert('put in a point');
      return false
    };
    createPoint({
      content: $("#newPointContent").val(),
      isActive: true
    });
    $("#newPointContent").val('');
    $("#newPointContent").focus();
  },
  'click #toggleStream': function() {
    var atLeastOnePointIsActive = false;
    var currentStatus = Streams.findOne({_id: Session.get("currentStream")}).status;
    $.each(getCurrentStreamPoints(), function(){
      if(this.isActive) atLeastOnePointIsActive = true;
    });
    if(currentStatus == 'finished' && atLeastOnePointIsActive) {
      Streams.update({_id: Session.get("currentStream")},{$set: {status: 'active'}});
    } else if (currentStatus == 'active'){
      makeAllPointsInActive();
      Streams.update({_id: Session.get("currentStream")},{$set: {status: 'finished'}});
    } else if (currentStatus == 'finished' && !atLeastOnePointIsActive) {
      alert('Make a point active');
    }
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
    if(pointContent.has('input.pointEditor').length > 0) {
      editButton.text('edit');
      editPoint(this, {content: pointContent.find('input.pointEditor').val()}); 
    } 
    else {
      var currentHtml = pointContent.html();
      var input = $('<input type="text" class="pointEditor span3"/>');
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
  },
  'click #changeStreamName' : function() {
    if($('#newStreamNameInput').val() =='') {
      alert('Put in a new Stream name');
      return false
    };
    Streams.update(
    {_id: Session.get("currentStream")},
    {$set: 
    {'name': $('#newStreamNameInput').val()}});
  },
  'click #submitNewModerator' : function() {
    if($("#addModeratorEmail").val() =='') {
      alert('Put in a new Stream name');
      return false
    };
    Meteor.call('addCollaborator', $("#addModeratorEmail").val(), Session.get("currentStream"), function(error, result) {
      if(error)
        alert(error.reason);
      if(result)
        console.log(result);
    });
  }
};
Template.modalTemplate.comments = function() {
  return this.comments;
}

Template.singlePointTemplate.allThumbsUp = function() {
  var thumbsString = (this.thumbsUp.length == 0) ? '0' : '+'+this.thumbsUp.length.toString();
  return thumbsString;
};
Template.singlePointTemplate.allThumbsDown = function() {
  return (this.thumbsDown.length == 0) ? '0' : '-'+this.thumbsDown.length.toString();
};
Template.singlePointTemplate.AllComments = function() {
  return (this.comments.length.toString() == '1') ? (this.comments.length.toString() + ' comment') : (this.comments.length.toString() + ' comments');
};
Template.singleModeratorsTemplate.owners = function() {
  return Meteor.users.findOne(this.toString()).profile.name;
  var thumbsString = (this.thumbsDown.length == 0) ? '0' : '-'+this.thumbsDown.length.toString();  
  return thumbsString;
};

////////// Tracking selected stream in URL //////////

var StreamsRouter = Backbone.Router.extend({
  routes: {
    "stream/:streamId": "stream",
    "invite/:streamId": "invite",
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
  invite: function (streamId) { //this happens when a new user is invited to be a collaborator that was not a user before
    Session.set("currentStream", streamId);
    Session.set("urlPart", true);
    Session.set("invitation", true);
  },
  setStream: function (streamId) {
    this.navigate("stream/"+streamId, true);
  }
});

Router = new StreamsRouter;

Meteor.startup(function () {
  Backbone.history.start();//{pushState: true});
});
