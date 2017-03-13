const models = require('./../../models/index');
// const redis = require('./../../redis');
const removeMd = require('remove-markdown');
const cache = require('./../../helpers/cache');

const attributes = [
    'id', 
    'title', 
    'content', 
    'releaseDate', 
    'userId', 
    'visibility', 
    'isTemp'
];

async function getPost({userId, id}) {
    const key = `graphql:post:id:${id}`;

    const cached = await cache.get(key);
    
    if(cached) {
        return Promise.resolve(cached);
    }

    const post = await models.Post.findById(id, {
        raw: true,
        attributes
    });


    if(post.isTemp || post.visibility !== 'public') {
        // 현재 공개되선 안되는 게시물
        if(userId !== post.userId) return Promise.resolve(null);
    }

    const writer = await models.User.findById(userId, {
        raw: true,
        attributes: ['username']
    });

    post.username = writer.username;
    

    if(!(post.isTemp || post.visibility !== 'public')) {
        // 공개 됐을 경우에만 캐싱
        cache.set(key, post);
    }

    return Promise.resolve(post);
}

module.exports = {
    Query: {
        post: async (obj, {id}, ctx) => {

            const userId = ctx.request.userId;

            const post = await getPost({
                userId,
                id
            });

            return post;
        }
    },

    Post: {
        preview: (obj, params, ctx) => {
            return removeMd(obj.content).substring(0,150);
        }
    }
}