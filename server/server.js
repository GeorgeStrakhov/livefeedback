//////////////startup stuff////////////////


/*
Currently using Meteor's Mailgun integration, but when we switch to our own deployment, will need to configure $MAIL_URL environmental variable to be 
"smtp://USERNAME:PASSWORD@HOST:PORT/"

Hostname : smtp.mailgun.org
Login    : postmaster@livefeedback.mailgun.org
Password : 69mcd874et05
Port: 587
*/


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

////////////methods//////////////////

Meteor.methods({
  'createNewStream': function(newStreamName) {
    if(!newStreamName) {
      throw new Meteor.Error(500, "no stream name passed!");
      return;
    }
    if(Streams.findOne({name: newStreamName})){
      throw new Meteor.Error(500, "Stream with such a name already exists! Please choose a different one.");
      return;
    }
    var newStreamId = Streams.insert({
      name: newStreamName, 
      owners: [this.userId],
      status: "active",
      joiners: [],
      points: []
    });
    //console.log(newStreamId);
    //now call Google url short. api to generate a short url and a qr code
    Meteor.http.call("POST", "https://www.googleapis.com/urlshortener/v1/url",
                 {headers: {"Content-Type": "application/json"}, data: {"longUrl":Meteor.absoluteUrl()+"#stream/"+newStreamId}},
                 function (error, result) {
                   if (error) {
                    console.log(error);
                   }
                   if (result.statusCode == "200") {
                     //console.log(result);
                     //console.log(result.data.id);
                     Streams.update(newStreamId, {$set: {shortUrl: result.data.id}});
                   }
                 });
    return newStreamId;
  },
  'addCollaborator' : function(email, streamId) {
    var userId = this.userId; //user invoking this
    if(! email) {
      throw new Meteor.Error(404, "No email received!");
      return;
    }
    if(! streamId) {
      throw new Meteor.Error(404, "No current StreamId provided");
      return;
    }
    var newCollaborator = Meteor.users.findOne({"services.facebook.email": email});
     //find a user with such an email
    console.log(email);
    console.log(newCollaborator);
    if(newCollaborator) { //there is a user with such an email
      //first add this user to the list of owners of the current stream
      var stream = Streams.findOne(streamId);
      if(stream) {
        //console.log(stream);
        Streams.update(streamId, {$addToSet: {owners: newCollaborator._id}});      
      //second send an email
      
        Email.send({
          from : "noreply@livefeedback.mobi",
          to : email,
          subject: Meteor.users.findOne(userId).profile.name+" invited you to be a moderator for '"+stream.name+"' livestream",
          text: "Please go to "+Meteor.absoluteUrl()+"#stream/"+streamId+" and login if you are willing to help moderate a stream called '"+stream.name+"'",
        });
      
        return "added successfully";
      } else {
        throw new Meteor.Error(404, "no such stream in the db");
      }

    } else { //there is no user with such an email in the system yet.
      var stream = Streams.findOne(streamId);
      //first we append a new object "pendingOwners" [] to the current Stream (if it doesn't already exist) abd put the invitation email in there
      Streams.update(streamId, {$push : {pendingOwners : email}});
      //then we send an invitation email and attach a special thing to the URL so that the new user is added to the owners of this list. (don't forget to check the pendingOwners)
      Email.send({
        from: "noreply@livefeedback.mobi",
        to: email,
        subject: Meteor.users.findOne(userId).profile.name+" invited you to be a moderator for '"+stream.name+"' livestream",
        text: "Please go to "+Meteor.absoluteUrl()+"#invite/"+streamId+" and login if you are willing to help moderate a stream called '"+stream.name+"'. This will only work if you use this email as your default email for Facebook. If not - please ask "+Meteor.users.findOne(userId).profile.name+" to invite you again using the right email. Thank you.",
      });
      //finally when the new user logs into the system with a special URL append - we double-check that it's the right user (email matches one in "pendingOwners") and add him as an owner and remove his email from pendingOnwers. [this part is done via backbone router and a 'pendingOwnerJoined' method call - see next]
      throw new Meteor.Error(204, "Such user is not in the system yet. Sent an invitation email.");
    }
  },
  'pendingOwnerJoined' : function(streamId) { //this is a part of the invitation of a new user as a collaborator process. when a new user logs into the system with the #invite/streamId url - our router calls this method before redirecting the user to the stream.
  //first double check that streamId is passed on and is valid
    if(!streamId) {
      throw new Meteor.Error(500, "no streamId passed");
    }
    var stream = Streams.findOne(streamId);
    if (!stream) {
      throw new Meteor.Error(404, "this stream doesn't exist"); 
      return;
    }
    //then check that the email of the user who just joined is in this stream's pendingOwners array 
    var currentUserEmail = "inna.givental@gmail.com"//Meteor.users.findOne(this.userId).services.facebook.email;
    //console.log(Meteor.users.findOne(this.userId));
    //console.log(this.userId);
    if(currentUserEmail && stream.pendingOwners) {
      for (var x=0; x<stream.pendingOwners.length; x++) {
        if (stream.pendingOwners[x] == currentUserEmail) { //then remove it from there && add this user to the owners of this stream 
          //console.log(Streams.findOne(streamId));
          Streams.update(streamId, {$pull : {pendingOwners: currentUserEmail}});
          Streams.update(streamId, {$addToSet: {owners: this.userId}});
          //console.log(Streams.findOne(streamId));
        }
      }
    }

  }
});

////////////allow logic/////////////

Streams.allow({
  insert: function (userId, doc) {
    return false;
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
    if(modifier['$set']) {
      var points = modifier['$set'].points;
      if(points) { //we're checking here that there is no such point in the new points array for which I have more than one vote

        for (var i=0; i<points.length; i++) {
          var point = points[i];
          var myThumbsUpOrDown = 0;
          for(var x=0; x<point.thumbsUp.length; x++) {
            if(point.thumbsUp[x] == userId)
              myThumbsUpOrDown++;
          }
          for(var x=0; x<point.thumbsDown.length; x++) {
            if(point.thumbsDown[x] == userId)
              myThumbsUpOrDown++;
          }
          if(myThumbsUpOrDown > 1) {
            return false;
          }
        }
      }
    }

    //if non of the above returned false -> we think it's ok so we return true
    return true;
  },
  remove: function () {
    return false; //there is no removing for now
  }
});

/////////publish stuff///////////

Meteor.publish("streams", function () { //only publish the streams to the Client of which he/she is an owner or a joiner of
  return Streams.find({});
});

Meteor.publish("directory", function () {
  return Meteor.users.find({}, {fields: {profile: 1}});
});


