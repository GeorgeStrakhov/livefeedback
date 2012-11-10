Meteor.startup(function() {
  if(!Accounts.loginServiceConfiguration.findOne()) { //if we just restarted the app and facebook login is not configured
    Accounts.loginServiceConfiguration.insert({
      service : "facebook", 
      appId : "479239908764045",
      secret : "c0804627fc8c8df52a0a4e5b399dccab"
    });
    console.log("configured facebook login");
  }
});

Lists = new Meteor.Collection("lists");
