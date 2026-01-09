const mongoose = require("mongoose");
const options = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false // Use 24-hour format
 };
const StudentSchema = new mongoose.Schema({
  code:Number,
  name: String,
  phone_1: [String],
  phone_2: [String],
  phone_3: [String],
  study_year:String,
  date:Date,
  is_Azhar:String,
  has_relative:String,
  relative:[String],
  is_payment:String,
  age:Number,
  landline: String,
  address: String,
  notes: String,
  image: String,
  amount:Number,
  active_status:String
},{timestamps:true});

const PaymentSchema = new mongoose.Schema({
  amount: Number,
  date: Date,
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'student'
  },
},{timestamps:true});

const AttendanceSchema = new mongoose.Schema({
  attend_days_month:[Object],
  status:String,
  date:Date,
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'student'
  }
},{timestamps:true});

const ActiveOrInActiveSchema = new mongoose.Schema({
  activatedDate:{type:Date , required:true},
  activeStatus:{type:String,required:true},
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'student'
  }
},{timestamps:true});

module.exports = { StudentSchema , PaymentSchema ,AttendanceSchema ,ActiveOrInActiveSchema }