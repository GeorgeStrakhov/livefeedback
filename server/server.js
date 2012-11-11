Meteor.startup(function() {
  if(!Accounts.loginServiceConfiguration.findOne()) { //if we just restarted the app and facebook login is not configured
    if(Meteor.absoluteUrl() == "http://localhost:3000/") {
      Accounts.loginServiceConfiguration.insert({
        service : "facebook", 
        appId : "457008651011649", //this is for localhost
        secret : "6c89e21415f919be11237b4310ba2dde" //this is for localhost
      });
    } else {
      Accounts.loginServiceConfiguration.insert({
        service : "facebook", 
        appId : "521808017829644", //this is for livefeedback.mobi
        secret : "49bb7952ef7dda24bc7a2701e689ec16" //this is for livefeedback.mobi
      });    
    }
    console.log("configured facebook login");
  }
});


Streams = new Meteor.Collection("streams");

Streams.allow({
  insert: function (userId, doc) {
    return (userId && doc.owners[0] == userId);
  },
  update: function (userId, docs, fields, modifier) {
    var stream = docs[0];
    //allow if I'm trying to add myself as a joiner and I'm not yet a joiner
    if(fields[0] == "joiners") {
      return true; //properly we also need to check that I'm not yet a joiner and I'm adding myself but later
    }
    //console.log(JSON.stringify(modifier));
    //disallow if I'm trying to change the stream(s) that I'm neither a joiner nor an owner of (unless I'm adding a new joiner that is me)
    var notAnOwner = true;
    for(var i=0; i<stream.owners.length; i++) {
      if(userId == stream.owners[i])
        notAnOwner = false;
    }
    var notAJoiner = true;
    for(i=0; i<stream.joiners.length; i++) {
      if(userId == stream.joiners[i])
        notAJoiner = false;
    }
    if(notAJoiner && notAnOwner) {
      return false;
    }
    //disallow if I'm trying to change something else than votes or comments on a stream that I'm not the owner of
    if(notAnOwner && (fields[0] != 'points')) {
      if(! (modifier["$push"]))
        return false;
    }
    //disallow if I'm trying to add more than one vote from myself to a point
    var alreadyVoted = false;
    if(modifier['$set']) {
      var points = modifier['$set'].points;
      if(points) { //we're checking here that there is no such point in the new points array for which I have more than one vote
        for (var i=0; i<points.length; i++) {
          //console.log(points[i]);
          var point = points[i];
          var myThumbsUpOrDown = 0;
          for(var i=0; i<point.thumbsUp.length; i++) {
            if(point.thumbsUp[i] == userId)
              myThumbsUpOrDown++;
          }
          for(var i=0; i<point.thumbsDown.length; i++) {
            if(point.thumbsDown[i] == userId)
              myThumbsUpOrDown++;
          }
          if(myThumbsUpOrDown > 1) {
            return false;
          }
        }
      }
    }
    if(alreadyVoted) {
      return false;
    }
    //if non of the above returned false -> we think it's ok so we return true
    return true;
  },
  remove: function () {
    return false; //there is no removing for now
  }
});

Meteor.publish("streams", function () { //only publish the streams to the Client of which he/she is an owner or a joiner of
  return Streams.find();
});

Meteor.publish("userDirectory", function () {
  return Meteor.users.find({}, {fields: {profile: 1}});
});

