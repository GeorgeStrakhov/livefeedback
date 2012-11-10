livefeedback.mobi
=================

startup weekend HK project

idea
====
livefeedback.mobi

Get live feedback from your audiense.


LiveFeedback.mobi is a simple system that allows everybody (event managers, speakers, workshop facilitators etc.) to get continuous live feedback from their audience. Setup in 30 seconds and no special hardware required.

Event organizers can create Streams of content (text, questions, urls, pictures) corresponding their events, and then collect live feedback from the audience. Basic functionality is available for free. For additional fee (per session) organizers can get deep data insights their audiences as well as follow-up with them to learn more.

Event participants can scan a code or enter a url (once!) and then provide their feedback (thumbs up / down and optionally a comment) to anything that’s happening.

technology
==========
meteor
bootstrap

data structure
==============
* user -> Meteor.user()
* Streams -> Meteor Collection
* each stream -> object {
  owners: [Meteor.userId(), ...] //grant permission fucntionality - add email
  status: "active" || "finished",
  joiners: [userId, userId, userId...],
  points: [{point}, {point}, {point}...],
  }
* each point -> object {
  timestamp: new Date(),
  content: "html string",
  isActive: true || false,
  comments: [{from: userId, text:""},{from: userID, text: ""}...],
  thumbsUp: [userId, userId, ...]
  thumbsDown: [userId, userId, userId...]
  }

Session variables (managing client side state), registered as handlebars helpers, accessible from any template, always up to date
=================
* "activeStream" -{} active stream
* "activePoint" - {} active point (reactively synced(!))
* "myOwnStream" - true || false (if it's my own stream)

todo
====
* user stories
* screens / flow
* prototype(!)
* customer validation
* business-plan & story & stuff

additional ideas
================
* timer for auto advance (question of the day etc.)
