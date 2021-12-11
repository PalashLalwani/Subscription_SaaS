const express = require("express");
const mongoose = require("mongoose");
const app = express();
const Schema = require("./models/Schema");
const Plans = require("./plans");

app.use(express.json());

mongoose.connect('mongodb://localhost:27017/subscriptionDB',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
)
.then(()=> console.log("connected to MongoDB"))
.catch((err)=> console.log(err));
;

const User = mongoose.model("UserDetails",Schema.UserSchema);
const Subscription = mongoose.model("SubscriptionDetails",Schema.SubscriptionSchema);

app.listen(3000, () => {
 console.log("Server running on port 3000");
});

//user insertion
app.put("/user/:username",async (req,res)=>{
    const fetchedUser = await getUser(req.params.username)
    if(fetchedUser){
        return res.status(406).json({error: "User already exist"});
    }
    var obj = {user_name: req.params.username, created_at: new Date()};
    User.create(obj, (err,result)=>{
        if(err){
            return res.status(500).json({error: err.message});
        }
        res.status(200).json({status : "SUCCESS"})
    })
})

const getUser = async function (username){
    console.log(username)
    return await User.findOne({user_name: username},{ user_name: 1, created_at: 1, _id: 0 }) 
}

//get user details, also added extra ammount field to keep track of account balance--> add amount_balance:1 in mongodb query to get balace.
app.get("/user/:username",async (req,res)=>{
    const fetchedUser = await getUser(req.params.username)
    console.log(fetchedUser)
    if(fetchedUser){
        return res.status(200).json(fetchedUser)
    }
    return res.status(404).json({error: "User doesn't exist"});
})

//add subscription for existing user
app.post("/Subscription",async (req,res)=>{
    const user = await getUser(req.body.user_name)
    const plan_id = req.body.plan_id

    if(!user){
        return res.status(404).json({error: "User doesn't exist"});
    }

    Date.prototype.addDays = function (days) {
        const date = new Date(this.valueOf());
        date.setDate(date.getDate() + days);
        return date;
    };
    
    const date = new Date(req.body.start_date);
    let amountBalance = 0
    if(Plans[plan_id]){
        const day = Plans[plan_id][0]
        const cost = Plans[plan_id][1]

        const start_date = date.toISOString().split('T')[0]
        const valid_till = date.addDays(day).toISOString().split('T')[0]
        console.log(day,cost)
        if (cost>0.0){
            const data = await User.findOne({user_name: req.body.user_name},{ user_name: 1, amount_balance: 1, _id: 0 })
            amountBalance += (data.amount_balance - cost)
        }
        Subscription.create({user_name: req.body.user_name, plan_id: req.body.plan_id, start_date : start_date, valid_till: valid_till  }).then((data)=>{
            User.updateOne({user_name: req.body.user_name},{amount_balance:amountBalance}).then((data1)=>{
                res.status(200).json({ status : "SUCCESS" , amount : -cost })
            })
        })
        .catch((err)=>{
            return res.status(500).json({status : "FAILURE"});
        }) 
    }
    else{
        return res.status(404).json({status : "FAILURE", Description: "Plan not found"});
    }
})

//get subcription details with optional date parameter
app.get("/subscription/:username/:date?",async (req,res)=>{
    const fetchedUser = await getUser(req.params.username)
    if(!fetchedUser){
        return res.status(404).json({error: "User doesn't exist"});
    }
    const date = req.params.date;
    console.log(date)
    if(date){
        let result = [];
        td = new Date();
        Subscription.find({user_name: req.params.username, start_date: date},(err,data)=>{
            if(err){
                return res.status(500).json({error: "Failure"});
            }
            if(data.length==0){
                return res.status(500).json({error: "No subscription record found for input date"});
            }
            else{
                data.map((ele,i)=>{
                    const date1 = new Date(td);
                    const date2 = new Date(ele.valid_till);
                    const diffTime = Math.abs(date2 - date1);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                    if(ele.plan_id == "FREE"){
                        result.push({plan_id: ele.plan_id, days_left: null})
                    }
                    else{
                        result.push({plan_id: ele.plan_id, days_left: diffDays})
                    }
                })

                res.status(200).json(result)
            }
        })
    }
    else{
        let result = [];
        Subscription.find({user_name: req.params.username},(err,data)=>{
            if(err){
                return res.status(500).json({error: "Failure"});
            }
            if(data.length==0){
                return res.status(404).json({error: "No subscription record found"});
            }
            else{
                data.map((ele,i)=>{
                    if(ele.plan_id == "FREE"){
                        result.push({plan_id: ele.plan_id, start_date: ele.start_date, valid_till: "Infinite"})
                    }
                    else{
                        result.push({plan_id: ele.plan_id, start_date: ele.start_date, valid_till: ele.valid_till})
                    }
                })
                res.status(200).json(result)
            }
        })
    }

})
