import express from "express";
import bodyParser from "body-parser";
//import mongodb tools so we can connect to db
import { MongoClient } from "mongodb";
import path from 'path';


const app = express();

app.use(express.static(path.join(__dirname, '/build')));
app.use(bodyParser.json());

//refactor code to DRY
const withDB = async (operations, res) => {
    try {
        //initialize mongo connection
        //127.0.0.1
        const client = await MongoClient.connect('mongodb://127.0.0.1:27017', { useNewUrlParser: true});
        
        //connect to our my-blog db
        const db = client.db('my-blog');
        
        //do some stuff
        await operations(db);
        
        //close db connection
        client.close();
    } catch (error) {
        res.status(500).send({message: 'Error connecting to the database', error})

    }
}

//create a new route so the app can connect to the db
app.get('/api/articles/:name', async (req, res) => {
    withDB(async (db) => {
        const articleName = req.params.name;
        //query the db
        const articleInfo = await db.collection('articles').findOne({ name: articleName});
        //return the article info
        res.status(200).json(articleInfo);  
    }, res)      
})

app.post('/api/articles/:name/upvote', async (req, res) => {
    withDB(async (db) => {
        const articleName = req.params.name;
        //find the article
        const articleInfo = await db.collection('articles').findOne({ name: articleName});
        //query to increase number of votes
        await db.collection('articles').updateOne( {name: articleName}, {
            $set: {
                upvotes: articleInfo.upvotes +1,
            }
        })
        //retrieve updated article
        const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName});
        //send back to the client
        res.status(200).json(updatedArticleInfo);
    }, res)
})

app.post('/api/articles/:name/add-comment', (req, res) => {
    withDB(async (db) => {
        const {username, text} = req.body;
        const articleName = req.params.name;
        
        //find the article
        const articleInfo = await db.collection('articles').findOne({ name: articleName});
        
        //update the comments array
        await db.collection('articles').updateOne( {name: articleName}, {
            $set: {
                comments: articleInfo.comments.concat({
                    username, text
                })
            }
        })
        const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName});
    
        res.status(200).send(updatedArticleInfo);
    }, res)
    
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/build/index.html'))
});

app.listen(8000, () => console.log("Listening on port 8000"));