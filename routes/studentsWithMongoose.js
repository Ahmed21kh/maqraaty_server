const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const bodyParser = require("body-parser");
const url = "mongodb://127.0.0.1:27017/Maqraaty";
const {
  StudentSchema,
  PaymentSchema,
  AttendanceSchema,
  ActiveOrInActiveSchema
} = require("../models/studentsModel");
const objectId = require("mongodb").ObjectId;
let schema = mongoose.Schema;
const AutoIncrementFactory = require("mongoose-sequence");
const xlsx2mongo = require("xlsx-mongo");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
// const studentSchema = new schema({
//   name: String,
//   phone_1: String,
//   phone_2: String,
//   landline: String,
//   address: String,
//   notes: String,
//   image: String,
// });

const Payment = mongoose.model("payment", PaymentSchema);
const Attendance = mongoose.model("attendance", AttendanceSchema);
const Student = mongoose.model("student", StudentSchema);
const ActiveOrInactive = mongoose.model("activeOrInactive", ActiveOrInActiveSchema);
function generateSixDigits() {
  return Math.floor(100000 + Math.random() * 900000);
}
let today = new Date(); // Get today's date
let currentYear = today.getFullYear();
let currentMonth = today.getMonth() + 1; // Adding 1 since months are 0-based
let startDate =new Date(currentYear,currentMonth - 1 , 1).toLocaleDateString()?.split("T")[0];
let endDate =new Date(currentYear,currentMonth ,0).toLocaleDateString()?.split("T")[0];

console.log(startDate , endDate);
// mongoose.connect(url, { useBigInt64: false }).then((clientdb) => {
// console.log(clientdb);
//Read students data

router.get("/students", async (req, res) => {
  // const {page , limit } = req.query;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const { status , code , name , phone } = req.query;
  const matchData = () => {
    if (code) {
      return {
        code: Number(code),
      };
    }
 
    if (name) {
      return {
        $expr: {
          $regexMatch: {
            input: "$name",
            regex: name,
            options: "i",
          },
        },
      };
    }
    if (phone) {
      return {
        $or: [
          { phone_1: { $regex: phone, $options: "i" } },
          { phone_2: { $regex: phone, $options: "i" } },
          { phone_3: { $regex: phone, $options: "i" } },
        ],
      };
    }  else {
      return {};
    }
  };


  let matchActiveOrInactive = () => {
    if (status) {
      return {
        activeStatus: 'in_active',
      };
    } else {
      return {};
    }
  }
  await Student.aggregate([
    // {
    //   $lookup: {
    //     from: ActiveOrInactive.collection.name,
    //     localField: "_id",
    //     foreignField: "student",
    //     as: "activeOrInactiveDetails",
    //   },
    // },
    {
      $lookup: {
        from: ActiveOrInactive.collection.name, // Name of the other collection
        let: { studentId: "$_id" },
      pipeline: [
        { $match: { $and:[
          {
            $expr: { $eq: ["$student", "$$studentId"] }
          },
          {
            activatedDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          }
        ]
        
        } },
        { $project: { student: 1, activatedDate: 1 , activeStatus:1 } }
      ],
        as: "activeOrInactiveDetails", // Output array field
      },
    },
    {
      $match: {
        activeOrInactiveDetails: {
          $not: {
            $elemMatch: matchActiveOrInactive(),
          },
        },
      },
    },
    // {
    //   $unwind: {
    //     path: "$activeOrInactiveDetails", // Unwind the studentDetails array
    //     preserveNullAndEmptyArrays: false, // Optional: Exclude documents without a match
    //   },
    // },
    // {
    //   $addFields: {
    //     activeOrInactiveDetails: "$activeOrInactiveDetails", // Move studentDetails back to top level
    //   },
    // },
    {
      $match: matchData(),
    },
    {
      $sort: {
        // name: 1,
        code: 1,
      },
    },
    {
      $facet: {
        metaData: [
          {
            $count: "total",
          },
          {
            $addFields: {
              pageNumber: Number(page),
              totalPages: { $ceil: { $divide: ["$total", limit] } },
            },
          },
        ],
        totalAmount: [{ $group: { _id: null, total: { $sum: "$amount" } } }],
        data: [
          {
            $skip: Number((page - 1) * limit),
          },
          {
            $limit: Number(limit),
          },
        ],
      },
    },
  ]).exec()
    .then((data) => {
      console.log("students data =====>",data);
      let result = data[0]
      // result.data = result.data.map(d=>{return {...d,activeOrInactiveDetails:d.activeOrInactiveDetails[0]?d.activeOrInactiveDetails[0]:{}}});
      result.metaData = {
        ...data[0].metaData[0],
        count: data[0]?.data?.length,
      };
      res.status(200).send(result);
    })
    .catch((e) => {
      res.status(500).json({ message: e.message });
    });
});

// student next code
router.get("/student_code", async (req, res) => {
  const students = await Student.find().exec();
  res.status(200).json({ code: students.length + 1 });
});
//get one user
router.get("/one_student", async (req, res) => {
  const { Id } = req.query;
  let user = await Student.findById(new objectId(Id)).exec();
  console.log("res ====>", res);
  res.status(200).send(user);
});
//get all names of students
router.get("/students_name", async (req, res) => {
  const { active_status } = req.query;
  let matchActiveOrInactive = () => {
    if ( active_status) {
      return {
        activeStatus: 'in_active',
      };
    } else {
      return {};
    }
  }


  let user = await Student.aggregate([
    {
      $lookup: {
        from: ActiveOrInactive.collection.name, // Name of the other collection
        let: { studentId: "$_id" },
      pipeline: [
        { $match: { $and:[
          {
            $expr: { $eq: ["$student", "$$studentId"] }
          },
          {
            activatedDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          }
        ]
        
        } },
        { $project: { student: 1, activatedDate: 1 , activeStatus:1 } }
      ],
        as: "activeOrInactiveDetails", // Output array field
      },
    },
    {
      $match: {
        activeOrInactiveDetails: {
          $not: {
            $elemMatch: {
              activeStatus: 'in_active',
            },
          },
        },
      },
    },
    {
      $sort: {
        name: 1,
      },
    },
  ]).exec().then(data => data);
  // console.log(user);
  // let data = user.map((data) => {
  //   return { _id: data._id, name: data.name };
  // });
  console.log("user ====>", user);
  res.status(200).send(user);
});

//Upload image
router.post("/upload-image", upload.single("file"), (req, res) => {
  console.log(req.file);
  if (req.file.size > 1024 * 1024 * 50) {
    res.status(413).json({
      message: "file is too large please upload file smaller than 50mb",
    });
  } else {
    res.send(req.file);
  }
});

//Add new student Data
router.post(
  "/add_student",
  bodyParser.json({ extended: true }),
  async (req, res) => {
    console.log(req.body);
    //   Student.createIndexes({ code: 1 }, (err) => {
    //     if (err) console.error(err);
    //   });
    // Student.listIndexes((err, indexes) => {
    //   if (err) console.error(err);
    //   console.log(indexes);
    // });
    // studentSchema.pre('save', function(next) {
    //   var doc = this;
    //   counter.findByIdAndUpdate({_id:"studentId"}, {$inc: { seq: 1} }, function(error, counter)   {
    //       if(error)
    //           return next(error);
    //       doc.code = counter.seq;
    //       next();
    //   });
    // });
    const data = await Student.find();
    if (req.body) {
      await Student.create({
        active_status: "active",
        code: data.length + 1,
        ...req.body,
      }).then((data) => {
        console.log("data", data);
        // clientdb.disconnect()
        res.status(200).json({ message: "student added success", data });
      });
    } else {
      res.status(400).json({ message: "no data found" });
    }
  }
);

//Update one student Data
router.put(
  "/update_student",
  bodyParser.json({ extended: true }),
  (req, res) => {
    console.log(req.body);
    console.log(req.query?.id);
    console.log(req.params);

    if (req.body) {
      Student.findByIdAndUpdate(new objectId(req.query?.id), req.body).then(
        (value) => {
          console.log(value);
          //  clientdb.disconnect()
          res.status(200).json({ message: "student updated successfuly" });
        }
      );
    } else {
      res.status(400).json({ message: "no data found" });
    }
  }
);
//search of data
router.get("/search_student", async (req, res) => {
  console.log(req.query?.code);
  console.log(req.query?.name);
  console.log(req.query?.phone);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  console.log(
    Object.keys(req.query)
      .filter((value) => value !== undefined)
      .map((d) => {
        {
          return d;
        }
      })
  );
  const filter = Object.keys(req.query)
    .filter((value) => value !== undefined)
    .map((d) => {
      if (d == "name") {
        {
          return { name: { $in: new RegExp(req.query[d], "i") } };
        }
      } else if (d == "phone") {
        {
          return {
            $or: [
              { phone_1: { $in: new RegExp(req.query[d], "i") } },
              { phone_2: { $in: new RegExp(req.query[d], "i") } },
              { phone_3: { $in: new RegExp(req.query[d], "i") } },
            ],
          };
        }
      } else if (d == "code") {
        {
          return { code: Number(req.query[d]) };
        }
      } else if (d == "status") {
        {
          return { active_status: req.query[d] };
        }
      } else {
      }
    })
    .concat([]);
  console.log(filter);
  let filterOp;
  if (filter.filter((d) => d !== undefined).length > 0) {
    filterOp = { $and: filter.filter((d) => d !== undefined) };
  } else {
    filterOp = {};
  }
  console.log("filterOp ===", filterOp);
  const queryName = new RegExp(req.query?.name, "i");
  const queryPhone = new RegExp(req.query?.phone, "i");
  // const querCode = new objectId(req.query?.code);
  const totalDoc = await Student.find(filterOp);
  await Student.find(filterOp)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ code: 1 })
    .then((value) => {
      console.log("data ===", value);
      //  clientdb.disconnect()
      res.status(200).json({
        metaData: {
          total: totalDoc?.length,
          pageNumber: page,
          totalPages: Math.ceil(totalDoc?.length / limit),
          count: value?.length,
        },
        data: value,
      });
    })
    .catch((e) => {
      res.status(500).json({ message: e.message });
    });
});

//change status of one student Data
router.delete("/delete_student", async (req, res) => {
  console.log(req.body);
  console.log(req.query?.id);
  console.log(req.params);
  if (req.query?.id) {
    try {
      await Student.findByIdAndDelete(new objectId(req.query?.id))
        .then(async (value) => {
          await Attendance.deleteMany({student:new objectId(req.query?.id)}).then(
            async (d) => {
              await Payment.deleteMany({student:new objectId(req.query?.id)}).then(
                (response) => {
                  res
                    .status(200)
                    .json({ message: "student deleted successfuly" });
                }
              );
            }
          );
        })
        .catch((error) => {
          res.status(500).json({ message: error.message });
        });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else {
    res.status(400).json({ message: "no data found" });
  }
});

//change status of one student Data
router.patch("/active_student", async (req, res) => {
  console.log(req.body);
  console.log(req.query?.id);
  console.log(req.params);
  if (req.query?.id) {
    await Student.findByIdAndUpdate(new objectId(req.query?.id), {
      active_status: req.body.status,
    }).then(async (value) => {
      console.log(value);
      if (req.query.status == "in_active") {
        res.status(200).json({ message: "student deleted successfuly" });
      } else {
        res.status(200).json({ message: "student actived successfuly" });
      }
    });
  } else {
    res.status(400).json({ message: "no data found" });
  }
});

//Add new payment
router.post(
  "/add_payment",
  bodyParser.json({ extended: true }),
  async (req, res) => {
    const amount = Number(req.body.amount);
    const date = req.body.date;
    const student = req.query.studentId;
    await Payment.create({ amount, date, student })
      .then((data) => {
        console.log(data);
        res.status(200).json({ message: "Payment added success", data });
      })
      .catch((err) => {
        res.status(400).json({ message: err.message });
      });
  }
);

//Get payments
router.get("/get_payments", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const { date } = req.query;
  const matchData = () => {
    if (date) {
      return {
        date: new Date(date),
      };
    } else {
      return {};
    }
  };
  // const matchData = Object.keys(req.query).filter(value => value !== undefined).map(d => {
  //   if (d == "date"){
  //     return {date:req.query[d]}
  //   }else {
  //     return {}
  //   }
  // })
  console.log(matchData(req.query.date));
  const totalAmounts = await Payment.aggregate([
    {
      $lookup: {
        from: ActiveOrInactive.collection.name, // Name of the other collection
        let: { studentId: "$student" },
      pipeline: [
        { $match: { $and:[
          {
            $expr: { $eq: ["$student", "$$studentId"] }
          },
          {
            activatedDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          }
        ]
        
        } },
        { $project: { student: 1, activatedDate: 1 , activeStatus:1 } }
      ],
        as: "activeOrInactiveDetails", // Output array field
      },
    },
    {
      $match: {
        activeOrInactiveDetails: {
          $not: {
            $elemMatch: {
              activeStatus: 'in_active'
            },
          },
        },
      },
    },
    {
      $match: matchData(req.query.date),
    },
    {
      $group: {
        _id: null, // Group all documents together
        totalAmount: { $sum: "$amount" }, // Sum the 'amount' field
      },
    },
  ]);
  // Convert the totalAmounts to a map for easy lookup
  //  const totalAmountMap = new Map(totalAmounts.map(item => [item._id.toString(), item.totalAmount]));
  console.log(totalAmounts[0]?.totalAmount);
  await Payment.aggregate([
    {
      $lookup: {
        from: "students", // Name of the other collection
        localField: "student", // Field from the attendance documents
        foreignField: "_id", // Field from the students documents
        as: "studentDetails", // Output array field
      },
    },
    {
      $lookup: {
        from: ActiveOrInactive.collection.name, // Name of the other collection
        let: { studentId: "$student" },
      pipeline: [
        { $match: { $and:[
          {
            $expr: { $eq: ["$student", "$$studentId"] }
          },
          {
            activatedDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          }
        ]
        
        } },
        { $project: { student: 1, activatedDate: 1 , activeStatus:1 } }
      ],
        as: "activeOrInactiveDetails", // Output array field
      },
    },
    {
      $match: {
        activeOrInactiveDetails: {
          $not: {
            $elemMatch: {
              activeStatus: 'in_active',
            }
          },
        },
      },
    },
    {
      $unwind: {
        path: "$studentDetails", // Unwind the studentDetails array
        preserveNullAndEmptyArrays: false, // Optional: Exclude documents without a match
      },
    },
    {
      $addFields: {
        studentDetails: "$studentDetails", // Move studentDetails back to top level
      },
    },
    {
      $match: {
        ...matchData(),
      },
    },
    {
      $sort: {
        // "studentDetails.name": 1,
        "updatedAt":1,
        // "studentDetails.code": 1,
      },
    },
    {
      $facet: {
        metaData: [
          {
            $count: "total",
          },
          {
            $addFields: {
              pageNumber: Number(page),
              totalPages: { $ceil: { $divide: ["$total", limit] } },
            },
          },
        ],
        data: [
          {
            $skip: Number((page - 1) * limit),
          },
          {
            $limit: Number(limit),
          },
        ],
      },
    },
  ])
    .then((data) => {
      console.log(data);
      let result = data[0];
      result.metaData = {
        ...data[0].metaData[0],
        count: data[0]?.data?.length,
        totalAmount: totalAmounts[0]?.totalAmount,
      };
      res.status(200).send(result);
    })
    .catch((e) => {
      res.status(500).json({ message: e.message });
    });
});

//Get payment by id
router.get("/get_one_payment", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const { studentId } = req.query;
  const matchData = (e) => {
    if (e !== "" && e !== "undefined") {
      return {
        date: new Date(e),
      };
    } else {
      return {};
    }
  };
  // const matchData = Object.keys(req.query).filter(value => value !== undefined).map(d => {
  //   if (d == "date"){
  //     return {date:req.query[d]}
  //   }else {
  //     return {}
  //   }
  // })
  // console.log(matchData(req.query.date));
  const totalAmounts = await Payment.aggregate([
    {
      $match: { student: new objectId(studentId) },
    },
    {
      $group: {
        _id: null, // Group all documents together
        totalAmount: { $sum: "$amount" }, // Sum the 'amount' field
      },
    },
  ]);
  const studentDetails = await Student.aggregate([
    {
      $match: { _id: new objectId(studentId) },
    },
    // {
    //   $group: {
    //     _id: null, // Group all documents together
    //     totalAmount: { $sum: "$amount" } // Sum the 'amount' field
    //   }
    // }
  ]);
  // Convert the totalAmounts to a map for easy lookup
  //  const totalAmountMap = new Map(totalAmounts.map(item => [item._id.toString(), item.totalAmount]));
  console.log(totalAmounts[0]?.totalAmount);
  await Payment.aggregate([
    {
      $match: { student: new objectId(studentId) },
    },
    {
      $lookup: {
        from: "students", // Name of the other collection
        localField: "student", // Field from the attendance documents
        foreignField: "_id", // Field from the students documents
        as: "studentDetails", // Output array field
      },
    },
    {
      $unwind: {
        path: "$studentDetails", // Unwind the studentDetails array
        preserveNullAndEmptyArrays: false, // Optional: Exclude documents without a match
      },
    },
    {
      $addFields: {
        studentDetails: "$studentDetails", // Move studentDetails back to top level
      },
    },
    {
      $facet: {
        metaData: [
          {
            $count: "total",
          },
          {
            $addFields: {
              pageNumber: Number(page),
              totalPages: { $ceil: { $divide: ["$total", limit] } },
            },
          },
        ],
        data: [
          {
            $skip: Number((page - 1) * limit),
          },
          {
            $limit: Number(limit),
          },
        ],
      },
    },
  ])
    .then((data) => {
      console.log(data);
      let result = data[0];
      result.metaData = {
        ...data[0].metaData[0],
        count: data[0]?.data?.length,
        totalAmount: totalAmounts[0]?.totalAmount,
        studentDetails: studentDetails[0],
      };
      res.status(200).send(result);
    })
    .catch((e) => {
      res.status(500).json({ message: e.message });
    });
});

//delete one Payment Data
router.delete("/delete_payment", (req, res) => {
  console.log(req.body);
  console.log(req.query?.id);
  console.log(req.params);
  if (req.query?.id) {
    Payment.findByIdAndDelete(new objectId(req.query?.id)).then((value) => {
      console.log(value);
      //  clientdb.disconnect()
      res.status(200).json({ message: "Payment deleted successfuly" });
    });
  } else {
    res.status(400).json({ message: "no data found" });
  }
});

//Update one payment Data
router.put(
  "/update_payment",
  bodyParser.json({ extended: true }),
  (req, res) => {
    console.log(req.body);
    console.log(req.query?.id);
    console.log(req.params);

    if (req.body) {
      Payment.findByIdAndUpdate(new objectId(req.query?.id), req.body).then(
        (value) => {
          console.log(value);
          //  clientdb.disconnect()
          res.status(200).json({ message: "payment updated successfuly" });
        }
      );
    } else {
      res.status(400).json({ message: "no data found" });
    }
  }
);

//get students that not paid this month
router.get("/get_not_pay", async (req, res) => {
  // try {
  console.log("get students");
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const { startDate, endDate, code, name, phone } = req.query;
  console.log(name);
  const matchData = () => {
    if (startDate && endDate) {
      return {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    } else {
      return {};
    }
  };
  const matchStudents = () => {
    if (code) {
      return {
        code: Number(code),
      };
    }
 
    if (name) {
      return {
        $expr: {
          $regexMatch: {
            input: "$name",
            regex: name,
            options: "i",
          },
        },
      };
    }
    if (phone) {
      return {
        $or: [
          { phone_1: { $regex: phone, $options: "i" } },
          { phone_2: { $regex: phone, $options: "i" } },
          { phone_3: { $regex: phone, $options: "i" } },
        ],
      };
    }  if(endDate) {
      return {
        date: {
          $lte: new Date(endDate),
        },
      }
    } else {
      return {};
    }
  };
  // console.log(matchData());
  console.log(matchStudents());

  // const skipIndex = (page - 1) * limit;

  // const match = {
  //   $match: {
  //     payments: {
  //       $not: {
  //         $elemMatch: matchData()
  //       }
  //     }
  //   }
  // };

  // const paginate = {
  //   $skip: skipIndex,
  //   $limit: limit
  // };

  // const lookup = {
  //   $lookup: {
  //     from: "payment",
  //     localField: "_id",
  //     foreignField: "student",
  //     as: "payments"
  //   }
  // };

  // const pipeline = [lookup, match, paginate];

  // const notPaidStudents = await Student.aggregate(pipeline).exec();
  // console.log("error");
  // console.log(notPaidStudents);
  // // const totalStudents = await Student.countDocuments();

  // res.status(200).json({
  //   data: notPaidStudents,
  //   // total: totalStudents,
  //   page: page,
  //   limit: limit
  // });
  // } catch (error) {
  //   console.log(error);
  //   res.status(500).json({ message: 'Server error' });
  // }

  await Student.aggregate([
    {
      $lookup: {
        from: Payment.collection.name,
        localField: "_id",
        foreignField: "student",
        as: "payments",
      },
    },
    {
      $lookup: {
        from: ActiveOrInactive.collection.name, // Name of the other collection
        let: { studentId: "$_id" },
      pipeline: [
        { $match: { $and:[
          {
            $expr: { $eq: ["$student", "$$studentId"] }
          },
          {
            activatedDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          }
        ]
        
        } },
        { $project: { student: 1, activatedDate: 1 , activeStatus:1 } }
      ],
        as: "activeOrInactiveDetails", // Output array field
      },
    },
    {
      $match: {
        activeOrInactiveDetails: {
          $not: {
            $elemMatch: {
              activeStatus: 'in_active',
            },
          },
        },
      },
    },
    //   {
    //     $match: {
    //         $expr: {
    //             $eq: [{ $size: "$payments" }, 0] // Ensures no payments are found
    //         }
    //     }
    // },
    {
      $match: {
        payments: {
          $not: {
            $elemMatch: matchData(),
          },
        },
      },
    },
    // {
    //   $match: {
    //     "payments.date": {
    //         $gte: new Date(startDate),
    //         $lt: new Date(endDate)
    //     }
    // }
    // },
    // {
    //   $match: {
    //     payments: { $size: 0 }, // Filter students without payments in the date range
    //   },
    // },
    // {
    //   $project: {
    //     code: 1,
    //     name: 1,
    //     phone_1: 1,
    //     phone_2: 1,
    //     phone_3: 1,
    //     study_year: 1,
    //     date: 1,
    //     is_Azhar: 1,
    //     has_relative: 1,
    //     relative: 1,
    //     is_payment: 1,
    //     age: 1,
    //     landline: 1,
    //     address: 1,
    //     notes: 1,
    //     image: 1,
    //     amount: 1,
    //     active_status: 1,
    //   },
    // },
    {
      $match: {
        ...matchStudents(),
        active_status: "active",
        is_payment: "لا",
      },
    },
    {
      $sort: {
        // name: 1,
        code: 1,
      },
    },
    {
      $facet: {
        metaData: [
          {
            $count: "total",
          },
          {
            $addFields: {
              pageNumber: Number(page),
              totalPages: { $ceil: { $divide: ["$total", limit] } },
            },
          },
        ],
        totalAmount: [{ $group: { _id: null, total: { $sum: "$amount" } } }],
        data: [
          {
            $skip: Number((page - 1) * limit),
          },
          {
            $limit: Number(limit),
          },
        ],
      },
    },
  ])
    .exec()
    .then((data) => {
      console.log(data);
      // let result = data[0];
      // result.metaData = {
      //   ...data[0].metaData[0],
      //   count: data[0]?.data?.length,
      //   // totalAmount: totalAmounts[0]?.totalAmount,
      //   // studentDetails: studentDetails[0],
      // };
      res.status(200).send(data[0]);
    })
    .catch((e) => {
      res.status(500).json({ message: e.message });
    });
});

//Get Attendance
router.get("/get_attendance", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const { date, code, name, phone } = req.query;
  const today = new Date();
  //  today.setHours(0, 0, 0, 0);
  const matchData = () => {
    if (code) {
      return {
        "studentDetails.code": Number(code),
      };
    }
    if (name) {
      return {
        $expr: {
          $regexMatch: {
            input: "$studentDetails.name",
            regex: name,
            options: "i",
          },
        },
      };
    }
    if (phone) {
      return {
        $or: [
          { "studentDetails.phone_1": { $regex: phone, $options: "i" } },
          { "studentDetails.phone_2": { $regex: phone, $options: "i" } },
          { "studentDetails.phone_3": { $regex: phone, $options: "i" } },
        ],
      };
    }
    if (date) {
      return {
        date: new Date(date), // Start date
        // $lte: new Date(e) // End date
      };
    } else {
      return {};
    }
  };
  console.log(matchData());
  // const matchData = Object.keys(req.query).filter(value => value !== undefined).map(d => {
  //   if (d == "date"){
  //     return {date:req.query[d]}
  //   }else {
  //     return {}
  //   }
  // })
  console.log(matchData(req.query.date));
  await Attendance.aggregate([
    {
      $lookup: {
        from: "students", // Name of the other collection
        localField: "student", // Field from the attendance documents
        foreignField: "_id", // Field from the students documents
        as: "studentDetails", // Output array field
      },
    },
    {
      $lookup: {
        from: ActiveOrInactive.collection.name, // Name of the other collection
        let: { studentId: "$student" },
      pipeline: [
        { $match: { $and:[
          {
            $expr: { $eq: ["$student", "$$studentId"] }
          },
          {
            activatedDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          }
        ]
        
        } },
        { $project: { student: 1, activatedDate: 1 , activeStatus:1 } }
      ],
        as: "activeOrInactiveDetails", // Output array field
      },
    },
    {
      $match: {
        activeOrInactiveDetails: {
          $not: {
            $elemMatch: {
              activeStatus: 'in_active',
            },
          },
        },
      },
    },
    {
      $unwind: {
        path: "$studentDetails", // Unwind the studentDetails array
        preserveNullAndEmptyArrays: false, // Optional: Exclude documents without a match
      },
    },
    {
      $addFields: {
  
        isToday: {
          $and: [
            {
              $ne: ["$status", "_"], // Check if updatedDate is today
            },

            {
              $eq: ["$date", new Date(new Date().toLocaleDateString("en-CA"))],
            },
          ],
        },
        isAbsence:{
              $and:[
                {
                  $eq: ["$status", "غائب"]
                },
                {
                  $eq: ["$date", new Date(new Date().toLocaleDateString("en-CA"))]
                }
              ]
      },
        studentDetails: "$studentDetails", // Move studentDetails back to top level
      },
    },
    {
      $match: {
        ...matchData(),
        "studentDetails.active_status": "active",
      },
    },
    {
      $sort: {
        // "studentDetails.name": 1,
        isToday: 1, // Sort by isToday in ascending order (true first)
        isAbsence:1,
        "studentDetails.code": 1
      },
    },
    {
      $facet: {
        metaData: [
          {
            $count: "total",
          },
          {
            $addFields: {
              pageNumber: Number(page),
              totalPages: { $ceil: { $divide: ["$total", limit] } },
            },
          },
        ],
        data: [
          {
            $skip: Number((page - 1) * limit),
          },
          {
            $limit: Number(limit),
          },
        ],
        attendanceDetails: [
          {
            $group: {
              _id: null,
              totalStudents: { $sum: 1 },
              totalAbsent: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$status", "غائب"] },
                        {
                          $eq: [
                            "$date",
                            new Date(new Date().toLocaleDateString("en-CA")),
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              totalAttend: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$status", "حاضر"] },
                        {
                          $eq: [
                            "$date",
                            new Date(new Date().toLocaleDateString("en-CA")),
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
      },
    },
  ])
    .then((data) => {
      console.log("attendance ===>", data);
      let result = data[0];
      result.metaData = {
        ...data[0].metaData[0],
        count: data[0]?.data?.length,
      };
      res.status(200).send(result);
    })
    .catch((e) => {
      res.status(500).json({ message: e.message });
    });
});

//Add new Attendance
router.post(
  "/add_attendance",
  bodyParser.json({ extended: true }),
  async (req, res) => {
    const attend_days_month = req.body.attend_days_month;
    const student = req.query.studentId;
    await Attendance.create({ ...req.body, student: req.query.studentId })
      .then((data) => {
        console.log(data);
        res.status(200).json({ message: "Attendance added success", data });
      })
      .catch((err) => {
        res.status(400).json({ message: err.message });
      });
  }
);

//Update one Attendance Data
router.put(
  "/update_attendance",
  bodyParser.json({ extended: true }),
  (req, res) => {
    console.log(req.body);
    console.log(req.query?.id);
    console.log(req.params);

    if (req.body) {
      Attendance.findByIdAndUpdate(new objectId(req.query?.id), req.body, {
        new: true,
      }).then((value) => {
        console.log(value);
        //  clientdb.disconnect()
        res
          .status(200)
          .json({ message: "Attendance updated successfuly", data: value });
      });
    } else {
      res.status(400).json({ message: "no data found" });
    }
  }
);

//delete one Attendance Data
router.delete("/delete_attendance", (req, res) => {
  // console.log(req.body);
  console.log(req.query?.id);
  // console.log(req.params);
  if (req.query?.id) {
    Attendance.findByIdAndDelete(new objectId(req.query?.id)).then((value) => {
      console.log(value);
      //  clientdb.disconnect()
      res.status(200).json({ message: "Attendance deleted successfuly" });
    });
  } else {
    res.status(400).json({ message: "no data found" });
  }
});

//Get Reports
router.get("/reports", async (req, res) => {
  const { startDate, endDate } = req.query;
  console.log(startDate, endDate);
  const matchData = () => {
    if (startDate && endDate) {
      return {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    } else {
      return {};
    }
  };
  // const matchData = Object.keys(req.query).filter(value => value !== undefined).map(d => {
  //   if (d == "date"){
  //     return {date:req.query[d]}
  //   }else {
  //     return {}
  //   }
  // })
  console.log(matchData());
  const amountOfAllStudents = await Student.aggregate([
    {
      $lookup: {
        from: ActiveOrInactive.collection.name, // Name of the other collection
        let: { studentId: "$_id" },
      pipeline: [
        { $match: { $and:[
          {
            $expr: { $eq: ["$student", "$$studentId"] }
          },
          {
            activatedDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          }
        ]
        
        } },
        { $project: { student: 1, activatedDate: 1 , activeStatus:1 } }
      ],
        as: "activeOrInactiveDetails", // Output array field
      },
    },
    {
      $match: {
        activeOrInactiveDetails: {
          $not: {
            $elemMatch: {
              activeStatus: 'in_active',
            },
          },
        },
      },
    },
    {
      $group: {
        _id: null, // Group all documents together
        totalAmount: { $sum: "$amount" }, // Sum the 'amount' field
      },
    },
  ]);

  await Payment.aggregate([
    {
      $lookup: {
        from: "students", // Name of the other collection
        localField: "student", // Field from the attendance documents
        foreignField: "_id", // Field from the students documents
        as: "studentDetails", // Output array field
      },
    },
    {
      $lookup: {
        from: ActiveOrInactive.collection.name, // Name of the other collection
        let: { studentId: "$_id" },
      pipeline: [
        { $match: { $and:[
          {
            $expr: { $eq: ["$student", "$$studentId"] }
          },
          {
            activatedDate: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          }
        ]
        
        } },
        { $project: { student: 1, activatedDate: 1 , activeStatus:1 } }
      ],
        as: "activeOrInactiveDetails", // Output array field
      },
    },
    {
      $match: {
        activeOrInactiveDetails: {
          $not: {
            $elemMatch: {
              activeStatus: 'in_active',
            },
          },
        },
      },
    },
    {
      $match: matchData(),
    },
    {
      $group: {
        _id: null, // Group all documents together
        totalAmount: { $sum: "$amount" }, // Sum the 'amount' field
      },
    },
  ])
    .then((data) => {
      console.log(data);
      let newData = {
        ...data[0],
        amountOfAllStudents: amountOfAllStudents[0]?.totalAmount,
      };
      res.status(200).send(newData);
    })
    .catch((e) => {
      res.status(500).json({ message: e.message });
    });
});
// });

async function getColumnIndexes(workbook, worksheetName) {
  const worksheet = workbook.getWorksheet(worksheetName);
  const headers = worksheet.getRow(1).values;
  const columnIndexes = {};

  headers.forEach((header, index) => {
    columnIndexes[header] = index + 1; // +1 because ExcelJS uses 1-based indexing
  });

  return columnIndexes;
}

// Import data from XLSX file
router.post(
  "/import-students-xlsx",
  upload.single("file"),
  async (req, res) => {
    console.log("file imported");
    console.log(req.file.path);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    //  console.log(workbook.getWorksheet(1));
    const worksheet = workbook.getWorksheet("Students"); // Assuming the data is in the first sheet
    const totalRows = worksheet.rowCount; // Get the total number of rows in the worksheet
    console.log(totalRows);
    const columnIndexes = await getColumnIndexes(workbook, 1);
    const studentsData = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        // Assuming the first row contains headers
        const student = {
          code: row.getCell(1).value,
          name: row.getCell(2).value,
          phone_1: row.getCell(3).value,
          // phone_2: row.getCell(columnIndexes['phone_2']).value,
          // phone_3: row.getCell(columnIndexes['phone_3']).value,
          // study_year: row.getCell(columnIndexes['study_year']).value,
          // date: row.getCell(columnIndexes['date']).value,
          // is_Azhar: row.getCell(columnIndexes['is_Azhar']).value,
          // has_relative: row.getCell(columnIndexes['has_relative']).value,
          // relative: row.getCell(columnIndexes['relative']).value,
          // is_payment: row.getCell(columnIndexes['is_payment']).value,
          // age: row.getCell(columnIndexes['age']).value,
          // landline: row.getCell(columnIndexes['landline']).value,
          // address: row.getCell(columnIndexes['address']).value,
          // notes: row.getCell(columnIndexes['notes']).value,
          // image: row.getCell(columnIndexes['image']).value,
          // amount: row.getCell(columnIndexes['amount']).value,
          // active_status: row.getCell(columnIndexes['active_status']).value,
          phone_2: row.getCell(4).value,
          phone_3: row.getCell(5).value,
          study_year: row.getCell(6).value,
          date: row.getCell(7).value,
          is_Azhar: row.getCell(8).value,
          has_relative: row.getCell(9).value,
          // relative: row.getCell(10).value,
          is_payment: row.getCell(10).value,
          age: row.getCell(11).value,
          landline: row.getCell(12).value,
          address: row.getCell(13).value,
          notes: row.getCell(14).value,
          // image: row.getCell(16).value,
          amount: row.getCell(15).value,
          active_status: row.getCell(16).value,
          // Map other fields as necessary
        };
        if (Object.values(student).some((value) => value)) {
          // Check if the row is not empty
          studentsData.push(student);
        }
      }
    });
    // console.log(rows.length);
    // Skip the header row
    // const dataRows = rows.slice(1);

    //  console.log(dataRows.length);

    // const students = dataRows.map((row) => ({
    //   code: row.getCell(1).value,
    //   name: row.getCell(2).value,
    //   phone_1: row.getCell(3).value,
    //   phone_2: row.getCell(4).value,
    //   phone_3: row.getCell(5).value,
    //   study_year: row.getCell(6).value,
    //   date: row.getCell(7).value,
    //   is_Azhar: row.getCell(8).value,
    //   has_relative: row.getCell(9).value,
    //   relative: row.getCell(10).value,
    //   is_payment: row.getCell(11).value,
    //   age: row.getCell(12).value,
    //   landline: row.getCell(13).value,
    //   address: row.getCell(14).value,
    //   notes: row.getCell(15).value,
    //   image: row.getCell(16).value,
    //   amount: row.getCell(17).value,
    //   active_status: row.getCell(18).value,
    // }));
    console.log(studentsData);
    try {
      // await Student.insertMany(students);
      res.send("Students imported successfully");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error importing students");
    }
  }
);

// Export data to XLSX file
router.get("/export-students-xlsx", async (req, res) => {
  try {
    // Fetch all students from the database
    const students = await Student.find({});

    // Create a new workbook and add a worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Students");

    // Define columns
    worksheet.columns = [
      { header: "code", key: "code", width: 10 },
      { header: "Name", key: "name", width: 20 },
      { header: "phone_1", key: "phone_1", width: 30 },
      { header: "phone_2", key: "phone_2", width: 30 },
      { header: "phone_3", key: "phone_3", width: 30 },
      { header: "study_year", key: "study_year", width: 10 },
      { header: "date", key: "date", width: 20 },
      { header: "is_Azhar", key: "is_Azhar", width: 10 },
      { header: "has_relative", key: "has_relative", width: 10 },
      { header: "is_payment", key: "is_payment", width: 20 },
      { header: "age", key: "age", width: 20 },
      { header: "landline", key: "landline", width: 20 },
      { header: "address", key: "address", width: 20 },
      { header: "notes", key: "notes", width: 20 },
      { header: "amount", key: "amount", width: 20 },
      { header: "active_status", key: "active_status", width: 10 },
    ];

    // Add rows
    students.forEach((student) => {
      worksheet.addRow(student);
    });

    // Write to file
    const fileName = `Students(${new Date().toLocaleDateString("en-CA")}).xlsx`;
    await workbook.xlsx.writeFile(fileName);

    // Send the file as a download
    res.download(fileName, (err) => {
      if (err) {
        console.error(err);
      }
      // Delete the file after sending it
      fs.unlinkSync(fileName);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error exporting students");
  }
});

router.post(
  "/activate-or-deactivate",
  bodyParser.json({ extended: true }),
  async (req, res) => {
  try {
    const {student} = req.body;
    console.log(student);
    let activeOrInactiveStudent = await ActiveOrInactive.findOne({  $and:[{student: new objectId(student)} ,  {activatedDate: { $gte: new Date(startDate) , $lt: new Date(endDate) }}]}); 
    console.log('activeOrInactiveStudent =======>',activeOrInactiveStudent);
    if (activeOrInactiveStudent) {
      await  ActiveOrInactive.findByIdAndUpdate(new objectId(activeOrInactiveStudent._id), {...req.body ,activatedDate: today }, {
        new: true,
      }).then((value) => {
        res.status(200).json({message:' successfully updated', data: value});
      })
    }else {
      await  ActiveOrInactive.create({...req.body ,activatedDate: today }).then((value) => {
        res.status(200).json({message:' successfully updated', data: value});
      })
    }
    
  } catch (error) {
    res.status(500).json({message: error.message});
  }
  })

  router.get(
    "/get-active-or-inactive",
    async (req, res) => {
      const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const { startDate, endDate, code, name, phone } = req.query;

  const matchData = () => {
    if (code) {
      return {
        code: Number(code),
      };
    }
 
    if (name) {
      return {
        $expr: {
          $regexMatch: {
            input: "$name",
            regex: name,
            options: "i",
          },
        },
      };
    }
    if (phone) {
      return {
        $or: [
          { phone_1: { $regex: phone, $options: "i" } },
          { phone_2: { $regex: phone, $options: "i" } },
          { phone_3: { $regex: phone, $options: "i" } },
        ],
      };
    }  if(startDate && endDate) {
      return {
        activatedDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }
    } else {
      return {};
    }
  };

  await ActiveOrInactive.aggregate([
    {
      $lookup: {
        from: "students", // Name of the other collection
        localField: "student", // Field from the attendance documents
        foreignField: "_id", // Field from the students documents
        as: "studentDetails", // Output array field
      },
    },
    {
      $unwind: {
        path: "$studentDetails", // Unwind the studentDetails array
        preserveNullAndEmptyArrays: false, // Optional: Exclude documents without a match
      },
    },
    {
      $addFields: {
        studentDetails: "$studentDetails", // Move studentDetails back to top level
      },
    },
    {
      $match: {
        ...matchData(),
        activeStatus:'in_active'
      },
    },
    {
      $sort: {
        // "studentDetails.name": 1,
        "updatedAt":1,
        "createdAt":-1,
        // "studentDetails.code": 1,
      },
    },
    {
      $facet: {
        metaData: [
          {
            $count: "total",
          },
          {
            $addFields: {
              pageNumber: Number(page),
              totalPages: { $ceil: { $divide: ["$total", limit] } },
            },
          },
        ],
        totalAmount: [{ $group: { _id: null, total: { $sum: "$studentDetails.amount" } } }],
        data: [
          {
            $skip: Number((page - 1) * limit),
          },
          {
            $limit: Number(limit),
          },
        ],
      },
    },
  ])
    .then((data) => {
      console.log(data);
      let result = data[0];
      result.metaData = {
        ...data[0].metaData[0],
        count: data[0]?.data?.length,
        // totalAmount: totalAmounts[0]?.totalAmount,
      };
      res.status(200).send(result);
    })
    .catch((e) => {
      res.status(500).json({ message: e.message });
    });
    })

module.exports = router;
