## 1. Connect to mongosh, SSO db
> mongosh 'mongodb+srv://blinqio:yj0qElbZvcJUf89z@sso-dev.kbh3dbi.mongodb.net/blinq-io-sso?retryWrites=true&w=majority'

## 2. Update
> db.projects.updateOne( { _id: ObjectId('projectId') }, { $set: { maxExecutionThreads:3 } } )
