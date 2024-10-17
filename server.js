const express=require('express')
const cors=require('cors')
const mongoose=require('mongoose')
require('dotenv').config();
const nodemailer=require('nodemailer');
const bcrypt=require('bcryptjs');

//Initializing server
const server=express();
server.use(cors())
server.use(express.urlencoded({extended:true}));
server.use(express.json());

//connection to Database
mongoose.connect(process.env.MYURL).then(()=>{
    console.log("Connected to DB");
}).catch((err)=>{
    console.log(err);
})

//Schema
const patientSchema = new mongoose.Schema({
    name: String,
    age: Number,
    condition: String,
    medicalHistory: [String],
    treatmentPlan: String,
    addedby:String
});
const authRequestSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    treatment: String,
    doctorName:String,
    doctorNotes: String,
    insurancePlan: String,
    diagnosisCode: String,
    dateOfService: Date,
    status: { type: String, default: 'pending' },
    timestamp: { type: Date, default: Date.now },
});
const otpSchema=new mongoose.Schema({
    otp:String,
    email:String,
});
const userSchema=new mongoose.Schema({
    name:String,
    email:String,
    hpassword:String
})

//models
const Patient=new mongoose.model('patient',patientSchema);
const authRequest=new mongoose.model('authRequest',authRequestSchema);
const otpdata=new mongoose.model('otpdata',otpSchema);
const User=new mongoose.model("users",userSchema);

//Login End Point
server.post("/login",async(req,res)=>{
    const  {email , password}=req.body;
    const hpassword=await bcrypt.hash(password,6);
    User.findOne({email:email}).then((user)=>{
        if(user && user.hpassword) {
          bcrypt.compare(password,user.hpassword).then(result => {
            if(result===true) {
              res.send({message : "Log in successFull",user:user});
            }
            else {
              res.send({message:"Incorrect Password"});
            }
         })
         .catch(err => {
             console.log(err)
         })
        }
        else {
            res.send({message:"User not Found"})
        }
    }).catch((err) => console.log(err));
  })

//endpoint to Signup
server.post("/signup",async(req,res)=>{
    const  {name , email, password,otp}=req.body;
    const hpassword=await bcrypt.hash(password,6)
    otpdata.findOne({email:email}).then((user)=> {
     if(user.otp!==otp) {
        res.send("Invalid OTP");
     }
     else {
         const user=new User({
             name,
             email,
             hpassword,
         })
         user.save().then(res.send("SuccessFully Registered"));
     }})
  })  

//Endpoint to Send OTP
server.post("/makemail",async(req, res) => {
    const {email,name}=req.body;
    User.findOne({email:email}).then((user)=> {
        if(user) {
            res.send("Email Already Registered");
        }
        else {
        try{
        const otp=Math.floor(100000 + Math.random()*900000);
        const transport=nodemailer.createTransport({
            service:'gmail',
            host: 'smtp.gmail.com',
            port:'587',
            auth:{
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            },
            secureConnection: 'true',
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
        });
        let matter= 'Hello ' + name + ' Here is your otp to Sign up for Patient Dashboard ' + otp + '  Please Dont Share with Anyone , Thank You';
        const mailOptions ={
         from:process.env.EMAIL,
         to :email,
         subject:"EMAIL FOR VERIFICATION",
         html:matter
        }
        otpdata.findOne({email:email}).then((user)=>{
           if(user) {
             user.otp=otp;
             user.save();
           }
           else {
            const newuser= new otpdata({
                email,
                otp
            })
            newuser.save();
           }
        })
        transport.sendMail(mailOptions,(err,info)=>{
         if(err) {
            res.send("Error in sending Mail");
         }
         else {
            res.send("OTP SENT Succesfully");
         }
        })
     }catch(err) {
       res.send(err);
     }
    }
})
})

//endpoint to add new patient
server.post("/addpatient",(req,res)=>{
    const {name,age,condition,medicalHistory,treatmentPlan,addedby}=req.body;
    const newPatient=new Patient({
        name,
        age,
        condition,
        medicalHistory,
        treatmentPlan,
        addedby
    })
    newPatient.save().then(res.send({message:"Successfull"})).catch((err)=>{
        res.send({message:"Not Successfull"})
    });
})


//end point to add new authorization request to specific patient
server.post("/auth-requests",async(req,res)=>{
    const { patientId, treatment, doctorName, doctorNotes, insurancePlan, diagnosisCode, dateOfService } = req.body;

    const newAuthRequest = new authRequest({
      patientId,
      treatment,
      doctorName,
      doctorNotes,
      insurancePlan,
      diagnosisCode,
      dateOfService,
    });
    try {
      const savedAuthRequest = await newAuthRequest.save();
      res.status(201).json(savedAuthRequest);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
})

//end point to get details of specific patient by ID
server.get('/patient/:id', async (req, res) => {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      const authRequests = await authRequest.find({ patientId: patient._id });
      res.json({ patient, authRequests });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
});

//end point to get all patient details
server.get("/getallpatients",async(req,res)=>{
    try {
        const patients = await Patient.find();
        res.json(patients);
    }catch (err) {
        res.status(500).json({ message: err.message });
    }
})


//port assigning
server.listen((9020),()=>{
    console.log("Server Running in port 9020");
})