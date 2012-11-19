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
  return currentStream.points[currentStream.activePoint];
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

////////// global helper functions ////////////


function createStream(details) {
  return Streams.insert({
    name: details.name, 
    owners: (details.owners) ? details.owners : [Meteor.userId()],
    status: (details.status) ? details.status : "active",
    joiners: [],
    points: [],
    activePoint: null
  });
};

function uniqueStreamName(newName) {
  return Streams.findOne({name: newName});
};

function createPoint(details) {
  var newPoint = {
    timestamp: new Date(),
    content: (details.content) ? details.content : "?",
    comments: [],
    thumbsUp: [],
    thumbsDown: []
  };
  updateCurrentStream({$push: {points: newPoint}});
  return newPoint;
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

function updateCurrentStream(obj){
  Streams.update(Session.get("currentStream"),obj);
}

function editPoint(point, details) {
  if(!point.timestamp) return false;
  var objSet = {};
  for (var key in details) {
    objSet['points.$.'+ key] = details[key];
  }; 
  console.log(details);
  Streams.update(
    {_id: Session.get("currentStream"),'points.timestamp': point.timestamp},
    {$set: objSet});
};

function getCurrentStreamPoints() { // just get all current points
  return Streams.findOne(Session.get("currentStream")).points;
}

function deletePoint(point) {
  var currentStream = Streams.findOne(Session.get("currentStream"));
  var currentPoint  = currentStream.points[currentStream.activePoint];
  var obj           = {$pull : {"points":point}};
  if(currentStream.activePoint == null) {
    updateCurrentStream(obj);
  } else if(currentStream.points[currentStream.activePoint].timestamp == point.timestamp) {
    obj['$set'] = {'activePoint': null};
    updateCurrentStream(obj);
  } else {
    updateCurrentStream(obj);
    var currentStream = Streams.findOne(Session.get("currentStream"));
    for (var i = currentStream.points.length - 1; i >= 0; i--) {
      if(currentPoint.timestamp == currentStream.points[i].timestamp) {
        updateCurrentStream({$set:{'activePoint':i}});
        break;
      }
    };
  }
}

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
    var currentStream = Streams.findOne({_id: Session.get("currentStream")});
    if(currentStream.activePoint == null) 
      return false;
    var newActivePoint = currentStream.activePoint + (($(e.srcElement).data('navigate')=='up') ? -1 : 1);
    if(currentStream.points[newActivePoint]) 
      updateCurrentStream({$set: {'activePoint': newActivePoint}});
    else 
      updateCurrentStream({$set: {'activePoint': null}});
  },
  'click .newPointBtn' : function(e) {
    var newPointInput = $("#newPointContent");
    if($.trim($("#newPointContent").val()) == '') {
      alert('put in a point');
      newPointInput.focus().val('');
      return false
    };
    createPoint({content: newPointInput.val()});
    newPointInput.focus().val('');
    if($(e.srcElement).hasClass('makeActive'))
      updateCurrentStream({$set: {'activePoint': Streams.findOne(Session.get("currentStream")).points.length-1}});
  },
  'click #toggleStream': function(e) {
    var currentStatus = Streams.findOne({_id: Session.get("currentStream")}).status;
    if(currentStatus == 'active')
      updateCurrentStream({$set: {status: 'finished', activePoint:null}});
    else if (currentStatus == 'finished')
      updateCurrentStream({$set: {status: 'active'}});
  },
  'keypress #newPointContent' : function(e) {
    if(e.keyCode == 13 ) 
      $('.newPointBtn:first').trigger('click');
  },
  'click .delete' : function() {
    deletePoint(this);
  },
  'click .edit' : function(e) {
    var editButton = $(e.srcElement);
    var pointContent = editButton.parents('li').find('div.pointContent');
    if(!this.editing) {
      this.editing = true;
      var currentHtml = pointContent.html();
      var input = $('<input type="text" class="pointEditor span3"/>')
                  .keypress(function(e){ if(e.keyCode == 13) editButton.trigger('click');})
                  .val(currentHtml);
      pointContent.html(input);
      input.focus();
      editButton.text('submit');
    } else {
      this.editing = false;
      editButton.text('edit');
      var newContent = pointContent.children('input').val();
      pointContent.html(newContent);
      editPoint(this, {content: newContent}); 
    }
  }, 
  'click .makeActive' : function(e) {
    var currentStreamPoints = Streams.findOne(Session.get("currentStream")).points;
    for (var i = currentStreamPoints.length - 1; i >= 0; i--) {
      if(this.timestamp == currentStreamPoints[i].timestamp) {
        updateCurrentStream({$set: {'activePoint': i}});
        break;
      }
    };
  },
  'click #changeStreamName' : function() {
    var newStreamNameInput = $('#newStreamNameInput');
    if(newStreamNameInput.val() == '') {
      alert('Put in a new Stream name');
      return false
    };
    updateCurrentStream({$set: {'name': newStreamNameInput.val()}});
  },
  'click #submitNewModerator' : function() {
    var addModeratorEmail = $("#addModeratorEmail");
    if(addModeratorEmail.val() =='') {
      alert('Put in a new Stream name');
      return false
    };
    Meteor.call('addCollaborator', addModeratorEmail.val(), Session.get("currentStream"), function(error, result) {
      if(error)
        alert(error.reason);
      if(result)
        console.log(result);
    });
  }
};

// singleModeratorsTemplate

Template.singleModeratorsTemplate.owners = function() {
  return Meteor.users.findOne(this.toString()).profile.name;
  var thumbsString = (this.thumbsDown.length == 0) ? '0' : '-'+this.thumbsDown.length.toString();  
  return thumbsString;
};

// singlePointTemplate

Template.singlePointTemplate.isActive = function() {
  var currentStream = Streams.findOne(Session.get("currentStream"));
  if(currentStream.activePoint == null || currentStream.points[currentStream.activePoint] == undefined) 
    return false;
  if(this.timestamp == currentStream.points[currentStream.activePoint].timestamp) 
    return true; 
  else 
    return false;
};
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

// modalTemplate

Template.modalTemplate.comments = function() {
  return this.comments;
}

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

