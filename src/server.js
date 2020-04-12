import express from 'express';
import bodyParser from 'body-parser';
import {MongoClient} from 'mongodb';
import path from 'path';

//Fake db with JSON



//Create our back end service app

const app = express();

//After copying the build folder in to the backend folder, we need to tell the app
//where to serve static files from, eg images.

app.use(express.static(path.join(__dirname, '/build')));

app.use(bodyParser.json());

//withDb is a function to hold all our database conntection functionality.
//It takes two arguements, operations - which is a function, and a response.

const withDB = async (operations, res) => {

    try{ 

        // Connect to the database. Mongo returns a client object and is asynchronous. This is also its
        // default port

        const client = await MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true});

        // In order to query the local database,we need to create a constant and set it equal to the returned client object,
        //and then the name of the database you want to query.

        const db = client.db('my-blog');

        //pass the database reference into the operations function
        //The operations functions are anonymous functions defined
        // in each of the CRUD functions

        await operations(db);

        //Now close the connection to mongoDB as we're finished

        client.close();

        //Wrap the whole lot in a try/catch in case something goes
        //wrong with the DB operations

    } catch(error){

        //If an error happens, send a response with a message and error to display

        res.status(500).json({message: 'Error connecting to DB', error});

    }

}

app.get('/api/articles/:name', async (req,res) =>{

    //Pass an anonymous function into the withDB function
    // The function gets the name from the paramater,
    // finds the corresponding article
    //and sends a response

    withDB(async (db) =>{ 

        const articleName = req.params.name;

        // The db const is also asynchronous. In order to read the database
        // pass the collection and the article who's name matches the name URL paramter
        // passed along the route

        const articleInfo = await db.collection('articles').findOne({name:articleName});

        //Send the article info in the response object. json is better than using "send" 
        // when dealing with json

        res.status(200).json(articleInfo);
        
    }, res)

    // ^^^ We have to pass the response as an arguement, as withDB takes two arguements

})
 
// Add a comment to database

app.post('/api/articles/:name/add-comment', (req, res) => {

    const{username, text} = req.body;

    const articleName = req.params.name;

    withDB(async(db) => {

        const articleInfo = await db.collection('articles').findOne({name:articleName});

        await db.collection('articles').updateOne({name:articleName}, {
            '$set':{

                // "concat" - as we're updating an array
                comments: articleInfo.comments.concat({username, text}),
            }
        });

        const updatedArticleInfo = await db.collection('articles').findOne({name: articleName})

        res.status(200).json(updatedArticleInfo);

    }, res);

})

app.post('/api/articles/:name/upvote', async (req, res) => {

    withDB( async (db) => {

        //Get the name of the article from the url param

        const articleName = req.params.name;


        //Find the article who's name matches our URL name paramater

        const articleInfo = await db.collection('articles').findOne({ name: articleName });

        //Like we use findOne to find an item, we use updateOne to update it. This takes two arguements.
        // The matching conditions, and the updates we want to apply

        await db.collection('articles').updateOne({name: articleName}, { 
            '$set': {
                upvotes: articleInfo.upvotes + 1,
            },
        });

        //Now get the updated article

        const updatedArticleInfo = await db.collection('articles').findOne({name: articleName});

        //Send the updated article back to the client

        res.status(200).json(updatedArticleInfo);

    });

});

//All requests that aren't caught by any of our other api routes
// should be passed on to our app

app.get('*', (req,res) => {

    res.sendFile(path.join(__dirname + '/build/index.html'));

});

//Make it so when our app recieves a GET request on the endpoint "hello", it
//responds with a message

//The callback takes two paramaters, req stores details about the request recieved, and res is a
//response object we can use to senda responseback to whoever made the request

// app.get('/hello', (req, res) => res.send('Hello'));

// app.get('/hello/:name', (req,res) => res.send(`Hello ${req.params.name}`));

// app.post('/hello', (req, res) => res.send(`Hello ${req.body.name}`));

//Start the app. Takes a callback with what to do once the app is listening

app.listen(8000, () => console.log("App is listening on port 8000"));