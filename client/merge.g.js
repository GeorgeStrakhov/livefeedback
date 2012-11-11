//Helper debug functions

function getCurrentStream(){
	return Streams.findOne(Session.get('currentStream'));
}

function setStreamOwner(ownerId){
	Streams.update(Session.get('currentStream'), {$set: {owners: [ownerId]}});
	return getCurrentStream();
}

function getActivePoint(){
  var points = getCurrentStreamPoints();
  for (i=0; i<points.length; i++) {
    if (points[i].isActive) return points[i];
  }
}

var thisPoint = {
	'get' : function(attr){
    var point = getActivePoint();
	  return point[attr];
	},
  'voted' : function(){
    var point = getActivePoint();
    if (typeof point === 'undefined') return;
    if ( $.inArray(Meteor.userId(), point.thumbsUp) > -1 ){
      return 'up';
    } else if ( $.inArray(Meteor.userId(), point.thumbsDown) > -1 ){
      return 'down';
    } else {
      return false;
    }
  },
  'addComment' : function(text){
    var point = getActivePoint();
    var comment = {userId: Meteor.userId(), text: text};
    point.comments.push(comment);
    editPoint(point, {comments: point.comments});
    alert('Thanks for the comment!');
    console.log('comment added');
  }
};

////////// Template specific behavior ////////////

Template.participantView.events = {
  'click #voteUp' : function() {
    votePoint('up');
    console.log('vote up');
  },
  'click #voteDown' : function() {
    votePoint('down');
    console.log('vote down');
  },
  'click #pointFeedbackButton' : function() {
    thisPoint.addComment( $('#pointFeedbackText').val() );
    $('#pointFeedbackText').val('');
  },
};

////////// global helper functions ////////////

/**
* votePoint()
*
* casts a vote on the currently active stream/point
* valid parameters are 'up', 'down'
* returns the point object
*/

function votePoint(direction) {
	//one vote per point, even if user votes multiple times
	var point = getActivePoint();
  var addField;
  var remField;
  switch (direction){
    case "up":
      addField = 'thumbsUp';
      remField = 'thumbsDown';
      break;
    case "down":
      addField = 'thumbsDown';
      remField = 'thumbsUp';
      break;
  }
  //only perform operation if 
  if ( $.inArray(Meteor.userId(), point[addField]) < 0){
    //add vote
    point[addField].push(Meteor.userId());
    //remove old vote if necessary
    var remPos = $.inArray(Meteor.userId(), point[remField]);
    if (remPos > -1){
      point[remField].splice(remPos, 1);
    }
    //only edit stream if the vote has changed
    editPoint(point, {thumbsUp: point.thumbsUp, thumbsDown: point.thumbsDown});
  }
  return point;
}

Handlebars.registerHelper("currentPointVotes", function(direction) {
  var point = getActivePoint();
  return point['thumbs'+direction].length;
});

Handlebars.registerHelper("voted", function() {
  return thisPoint.voted();
});

Handlebars.registerHelper("tasksLoaded", function() {
  return Session.get('tasksLoaded');
});
