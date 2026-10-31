import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const TODAY = "2026-10-31";
const ACADEMIC_YEAR_ID = "ay-2026-27";
const SCHOOL_ID = "school-nuv";
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const SATURDAY_PERIODS = 6;
const PERIOD_TIMES = [
  { period: 1, start: "08:00", end: "08:40" },
  { period: 2, start: "08:45", end: "09:25" },
  { period: 3, start: "09:30", end: "10:10" },
  { period: 4, start: "10:20", end: "11:00" },
  { period: 5, start: "11:05", end: "11:45" },
  { period: 6, start: "11:50", end: "12:30" },
  { period: 7, start: "13:00", end: "13:40" },
  { period: 8, start: "13:45", end: "14:25" },
];

function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20261031);
const pick = (items) => items[Math.floor(random() * items.length)];
const int = (min, max) => Math.floor(random() * (max - min + 1)) + min;
const chance = (probability) => random() < probability;
const pad = (value, width = 2) => String(value).padStart(width, "0");
const iso = (year, month, day) =>
  `${year}-${pad(month)}-${pad(day)}`;
const money = (rupees) => rupees * 100;

const maleFirst = [
  ["অমিতাভ", "Amitava"], ["সুমন", "Suman"], ["সৌম্যদীপ", "Soumyadeep"],
  ["রাহুল", "Rahul"], ["অর্ঘ্য", "Arghya"], ["দেবজিৎ", "Debjit"],
  ["সুব্রত", "Subrata"], ["প্রদীপ", "Pradip"], ["অনির্বাণ", "Anirban"],
  ["শুভ্র", "Shubhra"], ["রাজেশ", "Rajesh"], ["তন্ময়", "Tanmoy"],
  ["সায়ন", "Sayan"], ["অভিজিৎ", "Abhijit"], ["মৃণাল", "Mrinal"],
  ["সন্দীপ", "Sandip"], ["কৌশিক", "Kaushik"], ["প্রীতম", "Pritam"],
  ["শুভম", "Shubham"], ["নীলাদ্রি", "Niladri"], ["আর্য", "Arya"],
  ["ভাস্কর", "Bhaskar"], ["রূপম", "Rupam"], ["সন্তু", "Santu"],
  ["বিক্রম", "Bikram"], ["হৃতিক", "Hritik"], ["আকাশ", "Akash"],
  ["সৌরভ", "Sourav"], ["তুহিন", "Tuhin"], ["অমৃত", "Amrit"],
];

const femaleFirst = [
  ["অনন্যা", "Ananya"], ["সৌম্যা", "Soumya"], ["রিয়া", "Riya"],
  ["মৌমিতা", "Moumita"], ["অনিন্দিতা", "Anindita"], ["সুস্মিতা", "Susmita"],
  ["দীপিকা", "Deepika"], ["পৌলমী", "Paulami"], ["শ্রেয়া", "Shreya"],
  ["তনুশ্রী", "Tanushree"], ["মেঘনা", "Meghna"], ["ঐশিকী", "Aishiki"],
  ["নন্দিনী", "Nandini"], ["প্রিয়াঙ্কা", "Priyanka"], ["রূপশ্রী", "Rupashree"],
  ["সোহিনী", "Sohini"], ["অর্পিতা", "Arpita"], ["দেবযানী", "Debjani"],
  ["মধুবন্তী", "Madhubanti"], ["ঈশিতা", "Ishita"], ["সানজানা", "Sanjana"],
  ["পূর্ণিমা", "Purnima"], ["বৃষ্টি", "Brishti"], ["তিথি", "Tithi"],
  ["লিপিকা", "Lipika"], ["শর্মিষ্ঠা", "Sharmistha"], ["অন্বেষা", "Anwesha"],
  ["মহুয়া", "Mahua"], ["সাগরিকা", "Sagarika"], ["দিয়া", "Diya"],
];

const surnames = [
  ["সেন", "Sen"], ["ঘোষ", "Ghosh"], ["দাস", "Das"], ["রায়", "Roy"],
  ["চক্রবর্তী", "Chakraborty"], ["বন্দ্যোপাধ্যায়", "Banerjee"],
  ["মুখার্জী", "Mukherjee"], ["চট্টোপাধ্যায়", "Chatterjee"],
  ["ভট্টাচার্য", "Bhattacharya"], ["মজুমদার", "Majumdar"],
  ["সরকার", "Sarkar"], ["বিশ্বাস", "Biswas"], ["মণ্ডল", "Mondal"],
  ["পাল", "Pal"], ["দত্ত", "Dutta"], ["নন্দী", "Nandi"],
  ["সামন্ত", "Samanta"], ["কুণ্ডু", "Kundu"], ["গোস্বামী", "Goswami"],
  ["শীল", "Shil"], ["বসু", "Basu"], ["মিত্র", "Mitra"], ["সিংহ", "Singha"],
  ["হালদার", "Haldar"], ["প্রামাণিক", "Pramanik"], ["ভৌমিক", "Bhowmik"],
  ["আচার্য", "Acharya"], ["লাহা", "Laha"], ["মাইতি", "Maiti"],
  ["কর্মকার", "Karmakar"], ["দেব", "Deb"], ["সাঁতরা", "Satra"],
  ["পাত্র", "Patra"], ["বেরা", "Bera"], ["দোলুই", "Dolui"],
  ["খাঁ", "Khan"], ["মল্লিক", "Mallick"], ["সাহা", "Saha"],
  ["নাগ", "Nag"], ["পোদ্দার", "Poddar"],
];

const localities = [
  "Nabagram Station Road", "Kalitala", "School Para", "Bazar Para",
  "Purba Para", "Paschim Para", "Dakshin Para", "Uttar Para",
  "Natun Pally", "Shibtala",
];

const usedStudentNames = new Set();
const usedPhones = new Set();

function uniqueStudentName(gender) {
  const first = gender === "female" ? femaleFirst : maleFirst;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const given = pick(first);
    const family = pick(surnames);
    const key = `${given[1]}|${family[1]}`;
    if (!usedStudentNames.has(key)) {
      usedStudentNames.add(key);
      return { nameBn: `${given[0]} ${family[0]}`, nameEn: `${given[1]} ${family[1]}` };
    }
  }
  throw new Error("student name pool exhausted");
}

function phone() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = `98${int(10000000, 99999999)}`;
    if (!usedPhones.has(value)) {
      usedPhones.add(value);
      return value;
    }
  }
  throw new Error("phone pool exhausted");
}

const classLevels = ["V", "VI", "VII", "VIII", "IX", "X"];
const sectionLetters = ["A", "B"];
const sectionSizes = {
  "V-A": 40, "V-B": 39, "VI-A": 40, "VI-B": 39,
  "VII-A": 40, "VII-B": 39, "VIII-A": 39, "VIII-B": 48,
  "IX-A": 39, "IX-B": 39, "X-A": 39, "X-B": 39,
};

const school = {
  id: SCHOOL_ID,
  nameBn: "নবগ্রাম উচ্চ বিদ্যালয় (ডেমো)",
  nameEn: "Nabagram Uchcha Vidyalaya (Demo)",
  code: "WB-NAB-001",
  udise: "19000000001",
  type: "Government-sponsored co-educational secondary school",
  address: "Nabagram, Purba Bardhaman",
  district: "Purba Bardhaman",
  established: 1948,
  phone: "03452 255 014",
  email: "office@nabagram-demo.example",
};

const academicYear = {
  id: ACADEMIC_YEAR_ID,
  label: "2026–27",
  startDate: "2026-04-01",
  endDate: "2027-03-31",
  isActive: true,
};

const subjects = [
  { id: "ben", code: "BEN", nameBn: "বাংলা", nameEn: "Bengali" },
  { id: "eng", code: "ENG", nameBn: "ইংরেজি", nameEn: "English" },
  { id: "math", code: "MATH", nameBn: "গণিত", nameEn: "Mathematics" },
  { id: "psci", code: "PSCI", nameBn: "ভৌতবিজ্ঞান", nameEn: "Physical Science" },
  { id: "lsci", code: "LSCI", nameBn: "জীবনবিজ্ঞান", nameEn: "Life Science" },
  { id: "hist", code: "HIST", nameBn: "ইতিহাস", nameEn: "History" },
  { id: "geo", code: "GEO", nameBn: "ভূগোল", nameEn: "Geography" },
  { id: "we", code: "WE", nameBn: "কর্মশিক্ষা", nameEn: "Work Education" },
];

const staff = [];
const staffByName = new Map();

function addStaff(person) {
  staff.push(person);
  staffByName.set(person.employeeId, person);
  staffByName.set(person.id, person);
  return person;
}

function addAssignment(person, assignment) {
  const exists = person.assignments.some(
    (item) =>
      item.type === assignment.type &&
      item.sectionId === assignment.sectionId &&
      item.subjectId === assignment.subjectId,
  );
  if (!exists) person.assignments.push(assignment);
}

const headmaster = addStaff({
  id: "staff-hm",
  employeeId: "HM-001",
  nameBn: "অমিতাভ সেন",
  nameEn: "Amitava Sen",
  role: "headmaster",
  designation: "Headmaster",
  phone: "9830011001",
  email: "headmaster@nabagram-demo.example",
  avatar: "/avatars/student-25.svg",
  joinedAt: "2009-06-01",
  payLevel: "Level 17",
  status: "active",
  assignments: [],
});

const ananya = addStaff({
  id: "staff-ananya",
  employeeId: "TCH-027",
  nameBn: "অনন্যা সেন",
  nameEn: "Ananya Sen",
  role: "teacher",
  designation: "Assistant Teacher · Physical Science",
  phone: "9830011027",
  email: "ananya.sen@nabagram-demo.example",
  avatar: "/avatars/student-26.svg",
  joinedAt: "2016-07-11",
  payLevel: "Level 11",
  status: "active",
  primarySubjectId: "psci",
  assignments: [
    { type: "class_teacher", sectionId: "VIII-B" },
    { type: "subject_teacher", sectionId: "VIII-B", subjectId: "psci" },
    { type: "subject_teacher", sectionId: "IX-A", subjectId: "psci" },
    { type: "subject_teacher", sectionId: "IX-B", subjectId: "psci" },
  ],
});

const clerk = addStaff({
  id: "staff-clerk",
  employeeId: "CLK-014",
  nameBn: "সুমন দে",
  nameEn: "Suman Dey",
  role: "clerk",
  designation: "Head Clerk",
  phone: "9830011014",
  email: "clerk@nabagram-demo.example",
  avatar: "/avatars/student-27.svg",
  joinedAt: "2012-02-15",
  payLevel: "Level 9",
  status: "active",
  assignments: [{ type: "accountant" }],
});

const management = addStaff({
  id: "staff-management",
  employeeId: "MC-003",
  nameBn: "ড. দেবব্রত রায়",
  nameEn: "Dr. Debabrata Roy",
  role: "management",
  designation: "Chairperson, Managing Committee",
  phone: "9830011003",
  email: "mc@nabagram-demo.example",
  avatar: "/avatars/student-28.svg",
  joinedAt: "2024-04-01",
  payLevel: "—",
  status: "active",
  assignments: [],
});

const teacherNames = [
  ["সুব্রত দাস", "Subhas Das"], ["অনিন্দিতা রায়", "Anindita Roy"],
  ["মৌসুমী পাল", "Mousumi Pal"], ["প্রদীপ ঘোষ", "Pradip Ghosh"],
  ["শুভ্র চক্রবর্তী", "Shubhra Chakraborty"], ["তন্ময় মুখার্জী", "Tanmoy Mukherjee"],
  ["সায়ন ভট্টাচার্য", "Sayan Bhattacharya"], ["মৃণাল মজুমদার", "Mrinal Majumdar"],
  ["সন্দীপ সরকার", "Sandip Sarkar"], ["কৌশিক বিশ্বাস", "Kaushik Biswas"],
  ["প্রীতম মণ্ডল", "Pritam Mondal"], ["নীলাদ্রি দত্ত", "Niladri Dutta"],
  ["আর্য নন্দী", "Arya Nandi"], ["ভাস্কর সামন্ত", "Bhaskar Samanta"],
  ["রূপম কুণ্ডু", "Rupam Kundu"], ["বিক্রম গোস্বামী", "Bikram Goswami"],
  ["আকাশ শীল", "Akash Shil"], ["সৌরভ বসু", "Sourav Basu"],
  ["তুহিন মিত্র", "Tuhin Mitra"], ["অমৃত সিংহ", "Amrit Singha"],
  ["রাজেশ হালদার", "Rajesh Haldar"], ["দেবজিৎ প্রামাণিক", "Debjit Pramanik"],
];

const teacherStaff = teacherNames.map(([nameBn, nameEn], index) =>
  addStaff({
    id: `staff-teacher-${pad(index + 1)}`,
    employeeId: `TCH-${pad(index + 1, 3)}`,
    nameBn,
    nameEn,
    role: "teacher",
    designation: "Assistant Teacher",
    phone: `983002${pad(index + 1, 4)}`,
    email: `teacher${pad(index + 1, 2)}@nabagram-demo.example`,
    avatar: `/avatars/student-${pad(((index + 2) % 32) + 1)}.svg`,
    joinedAt: iso(2010 + (index % 12), (index % 12) + 1, 10),
    payLevel: "Level 11",
    status: "active",
    assignments: [],
  }),
);

const minori = addStaff({
  id: "staff-minori",
  employeeId: "TCH-023",
  nameBn: "মিনরি দাস",
  nameEn: "Minori Das",
  role: "teacher",
  designation: "Assistant Teacher · English",
  phone: "9830022023",
  email: "minori.das@nabagram-demo.example",
  avatar: "/avatars/student-30.svg",
  joinedAt: "2021-06-14",
  payLevel: "Level 11",
  status: "active",
  primarySubjectId: "eng",
  assignments: [],
});
teacherStaff.push(minori);

const subjectIds = subjects.map((subject) => subject.id);
teacherStaff.forEach((person, index) => {
  person.primarySubjectId = subjectIds[index % subjectIds.length];
});
teacherStaff[0].designation = "Assistant Headmaster · Mathematics";
teacherStaff[0].primarySubjectId = "math";
teacherStaff[0].assignments.push({ type: "assistant_headmaster" });
teacherStaff[5].primarySubjectId = "eng";
teacherStaff[9].primarySubjectId = "math";
minori.primarySubjectId = "eng";

const supportStaff = [
  ["সবিতা মাইতি", "Sabita Maiti", "Librarian"],
  ["রতন কর্মকার", "Ratan Karmakar", "Laboratory Assistant"],
  ["পূজা দেব", "Puja Deb", "Office Assistant"],
  ["বাপি সাঁতরা", "Bapi Satra", "Security"],
  ["লক্ষ্মী পাত্র", "Lakshmi Patra", "Sweeper"],
];

supportStaff.forEach(([nameBn, nameEn, designation], index) => {
  addStaff({
    id: `staff-support-${pad(index + 1)}`,
    employeeId: `SUP-${pad(index + 1, 3)}`,
    nameBn,
    nameEn,
    role: "support",
    designation,
    phone: `983003${pad(index + 1, 4)}`,
    email: `support${pad(index + 1, 2)}@nabagram-demo.example`,
    avatar: `/avatars/student-${pad(29 + index)}.svg`,
    joinedAt: iso(2014 + index, 6, 1),
    payLevel: "Level 5",
    status: "active",
    assignments: [],
  });
});

const sections = [];
let teacherCursor = 0;

for (const classLevel of classLevels) {
  for (const letter of sectionLetters) {
    const id = `${classLevel}-${letter}`;
    const classTeacher =
      id === "VIII-B" ? ananya : teacherStaff[teacherCursor++ % teacherStaff.length];
    if (id !== "VIII-B") {
      classTeacher.assignments.push({ type: "class_teacher", sectionId: id });
    }
    sections.push({
      id,
      classLevel,
      section: letter,
      room: `R-${classLevels.indexOf(classLevel) + 1}${letter === "A" ? "01" : "02"}`,
      capacity: 50,
      classTeacherId: classTeacher.id,
    });
  }
}

const scenarioSubjectTeachers = new Map([
  ["VIII-B:psci", ananya],
  ["IX-A:psci", ananya],
  ["IX-B:psci", ananya],
  ["VI-A:eng", teacherStaff[5]],
  ["V-B:eng", teacherStaff[5]],
  ["VII-A:math", teacherStaff[9]],
]);

for (const section of sections) {
  for (const subject of subjects) {
    const key = `${section.id}:${subject.id}`;
    const scenarioTeacher = scenarioSubjectTeachers.get(key);
    if (scenarioTeacher) {
      addAssignment(scenarioTeacher, {
        type: "subject_teacher",
        sectionId: section.id,
        subjectId: subject.id,
      });
      continue;
    }
    const teacher = teacherStaff[int(0, teacherStaff.length - 1)];
    addAssignment(teacher, {
      type: "subject_teacher",
      sectionId: section.id,
      subjectId: subject.id,
    });
  }
}

for (const [teacher, sectionId, subjectId] of [
  [minori, "VI-A", "eng"],
  [minori, "VI-B", "eng"],
  [minori, "V-A", "eng"],
  [teacherStaff[1], "V-B", "eng"],
  [teacherStaff[3], "VII-A", "math"],
  [teacherStaff[7], "VII-A", "math"],
]) {
  addAssignment(teacher, {
    type: "subject_teacher",
    sectionId,
    subjectId,
  });
}

teacherStaff[2].assignments.push({
  type: "exam_coordinator",
  examId: "exam-half-2026",
});

const fixedTimetableEntries = [
  {
    day: "SAT",
    period: 1,
    sectionId: "VIII-B",
    subjectId: "psci",
    teacherId: ananya.id,
  },
  {
    day: "SAT",
    period: 2,
    sectionId: "IX-A",
    subjectId: "psci",
    teacherId: ananya.id,
  },
  {
    day: "SAT",
    period: 3,
    sectionId: "IX-B",
    subjectId: "psci",
    teacherId: ananya.id,
  },
  {
    day: "SAT",
    period: 2,
    sectionId: "V-B",
    subjectId: "eng",
    teacherId: teacherStaff[5].id,
  },
  {
    day: "SAT",
    period: 4,
    sectionId: "VI-A",
    subjectId: "eng",
    teacherId: teacherStaff[5].id,
  },
  {
    day: "SAT",
    period: 5,
    sectionId: "VII-A",
    subjectId: "math",
    teacherId: teacherStaff[9].id,
  },
];

const fixedTimetableBySlot = new Map(
  fixedTimetableEntries.map((entry) => [
    `${entry.day}:${entry.period}:${entry.sectionId}`,
    entry,
  ]),
);
const reservedTeacherSlots = new Set(
  fixedTimetableEntries.map(
    (entry) => `${entry.day}:${entry.period}:${entry.teacherId}`,
  ),
);

function teacherMayBeScheduled(day, period, sectionId, teacher) {
  if (day !== "SAT") return true;
  if (teacher.id === minori.id) return false;
  if (teacher.id === ananya.id) {
    return fixedTimetableEntries.some(
      (entry) =>
        entry.period === period &&
        entry.sectionId === sectionId &&
        entry.teacherId === ananya.id,
    );
  }
  if (teacher.id === teacherStaff[5].id || teacher.id === teacherStaff[9].id) {
    return fixedTimetableEntries.some(
      (entry) =>
        entry.period === period &&
        entry.sectionId === sectionId &&
        entry.teacherId === teacher.id,
    );
  }
  if (teacher.id === teacherStaff[1].id && period === 2) return false;
  return true;
}

function teacherPriority(teacher, section, subjectId) {
  let score = 0;
  if (
    teacher.assignments.some(
      (assignment) =>
        assignment.type === "subject_teacher" &&
        assignment.sectionId === section.id &&
        assignment.subjectId === subjectId,
    )
  ) {
    score += 60;
  }
  if (teacher.primarySubjectId === subjectId) score += 25;
  if (section.classTeacherId === teacher.id) score += 10;
  if (
    teacher.assignments.some(
      (assignment) => assignment.type === "assistant_headmaster",
    )
  ) {
    score -= 20;
  }
  return score;
}

function chooseTimetableTeacher(day, period, section, subjectId, busy, load) {
  const slot = `${day}:${period}`;
  const eligible = teacherStaff.filter((teacher) =>
    teacherMayBeScheduled(day, period, section.id, teacher),
  );
  let pool = eligible.filter(
    (teacher) =>
      !busy.has(`${slot}:${teacher.id}`) &&
      !reservedTeacherSlots.has(`${slot}:${teacher.id}`),
  );

  if (pool.length === 0) {
    pool = eligible.filter((teacher) => !busy.has(`${slot}:${teacher.id}`));
  }
  if (pool.length === 0) return null;

  pool.sort((left, right) => {
    const priority =
      teacherPriority(right, section, subjectId) -
      teacherPriority(left, section, subjectId);
    if (priority !== 0) return priority;
    const loadDifference =
      (load.get(left.id) ?? 0) - (load.get(right.id) ?? 0);
    if (loadDifference !== 0) return loadDifference;
    return left.nameEn.localeCompare(right.nameEn);
  });

  return pool[0];
}

function buildTimetable() {
  const entries = [];
  const busy = new Set();
  const load = new Map();
  let sequence = 0;

  DAYS.forEach((day, dayIndex) => {
    const periodCount = day === "SAT" ? SATURDAY_PERIODS : PERIOD_TIMES.length;
    const slotsBySection = new Map();

    sections.forEach((section, sectionIndex) => {
      const rotation =
        (dayIndex * 3 + sectionIndex * 2) % subjects.length;
      const ordered = [
        ...subjects.slice(rotation),
        ...subjects.slice(0, rotation),
      ].map((subject) => subject.id);
      const slots = Array(periodCount).fill(null);

      for (const fixed of fixedTimetableEntries) {
        if (fixed.day === day && fixed.sectionId === section.id) {
          slots[fixed.period - 1] = fixed.subjectId;
        }
      }

      const used = new Set(slots.filter(Boolean));
      let cursor = 0;
      for (let index = 0; index < periodCount; index += 1) {
        if (slots[index]) continue;
        while (cursor < ordered.length && used.has(ordered[cursor])) {
          cursor += 1;
        }
        if (cursor < ordered.length) {
          slots[index] = ordered[cursor];
          used.add(ordered[cursor]);
          cursor += 1;
        } else {
          const fallback = subjects.find(
            (subject) => !used.has(subject.id),
          );
          slots[index] = fallback?.id ?? ordered[index];
          used.add(slots[index]);
        }
      }

      slotsBySection.set(section.id, slots);
    });

    for (let period = 1; period <= periodCount; period += 1) {
      const timings = PERIOD_TIMES[period - 1];
      const offset = (dayIndex + period) % sections.length;
      const orderedSections = [
        ...sections.slice(offset),
        ...sections.slice(0, offset),
      ];

      for (const section of orderedSections) {
        const fixed = fixedTimetableBySlot.get(
          `${day}:${period}:${section.id}`,
        );
        const subjectId =
          fixed?.subjectId ?? slotsBySection.get(section.id)[period - 1];
        let teacher = fixed
          ? staffByName.get(fixed.teacherId)
          : chooseTimetableTeacher(
              day,
              period,
              section,
              subjectId,
              busy,
              load,
            );

        if (!teacher) {
          teacher = teacherStaff.find(
            (person) =>
              !busy.has(`${day}:${period}:${person.id}`),
          );
        }
        if (!teacher) continue;

        busy.add(`${day}:${period}:${section.id}`);
        busy.add(`${day}:${period}:${teacher.id}`);
        load.set(teacher.id, (load.get(teacher.id) ?? 0) + 1);

        sequence += 1;
        entries.push({
          id: `tt-${pad(sequence, 4)}`,
          day,
          period,
          start: timings.start,
          end: timings.end,
          sectionId: section.id,
          subjectId,
          teacherId: teacher.id,
          room: section.room,
        });
      }
    }
  });

  return entries;
}

const timetable = buildTimetable();

const substitutions = [
  {
    id: "sub-001",
    date: TODAY,
    day: "SAT",
    period: 2,
    sectionId: "V-B",
    subjectId: "eng",
    absentTeacherId: teacherStaff[5].id,
    substituteTeacherId: teacherStaff[1].id,
    status: "covered",
    assignedBy: headmaster.id,
    reason:
      "English period covered while Mr. Mukherjee attended a family medical appointment.",
    createdAt: `${TODAY}T08:42:00+05:30`,
  },
];

const students = [];
let studentIndex = 0;

for (const section of sections) {
  const classIndex = classLevels.indexOf(section.classLevel);
  const size = sectionSizes[section.id];

  for (let roll = 1; roll <= size; roll += 1) {
    let gender = chance(0.5) ? "female" : "male";
    let name = uniqueStudentName(gender);

    if (section.id === "VIII-B" && roll === 12) {
      gender = "male";
      name = { nameBn: "সৌম্যদীপ ঘোষ", nameEn: "Soumyadeep Ghosh" };
      usedStudentNames.add("Soumyadeep|Ghosh");
    }

    const family = name.nameEn.split(" ").slice(1).join(" ");
    const guardianFirst = pick(maleFirst);
    const categoryRoll = random();
    const category =
      categoryRoll < 0.55
        ? "general"
        : categoryRoll < 0.77
          ? "sc"
          : categoryRoll < 0.85
            ? "st"
            : "obc";
    const risk =
      section.id === "VIII-B" && roll === 5
        ? "low"
        : section.id === "IX-A" && roll === 7
          ? "low"
          : section.id === "X-B" && roll === 3
            ? "chronic"
            : "normal";

    const birthYear = 2016 - classIndex;
    const admissionYear = 2017 + classIndex;

    students.push({
      id: `stu-${pad(studentIndex + 1, 4)}`,
      admissionNo: `NUV-${admissionYear}-${pad(studentIndex + 1, 4)}`,
      rollNo: pad(roll),
      sectionId: section.id,
      nameBn: name.nameBn,
      nameEn: name.nameEn,
      gender,
      dob: iso(birthYear, int(1, 12), int(1, 28)),
      guardianName: `${guardianFirst[0]} ${family}`,
      guardianPhone: phone(),
      address: `House ${int(1, 120)}, ${pick(localities)}, Nabagram, Purba Bardhaman`,
      category,
      status: "active",
      avatar: `/avatars/student-${pad((studentIndex % 32) + 1)}.svg`,
      admissionDate: iso(admissionYear, 4, 1),
      attendanceSeed: int(1000, 999999),
      attendanceRisk: risk,
      documents: [
        { type: "birth_certificate", label: "Birth certificate", verified: true },
        { type: "aadhaar", label: "Aadhaar (masked)", verified: true },
        { type: "previous_report", label: "Previous report card", verified: chance(0.94) },
        { type: "guardian_id", label: "Guardian ID", verified: chance(0.9) },
      ],
    });
    studentIndex += 1;
  }
}

const studentById = new Map(students.map((student) => [student.id, student]));
const studentsBySection = new Map();
for (const student of students) {
  const list = studentsBySection.get(student.sectionId) ?? [];
  list.push(student);
  studentsBySection.set(student.sectionId, list);
}

const attendance = [];
let attendanceIndex = 0;

for (const section of sections) {
  if (section.id === "VIII-B") continue;
  for (const student of studentsBySection.get(section.id)) {
    const roll = random();
    const status = roll < 0.94 ? "present" : roll < 0.98 ? "absent" : "late";
    attendance.push({
      id: `att-${pad(attendanceIndex + 1, 4)}`,
      studentId: student.id,
      sectionId: section.id,
      date: TODAY,
      session: "full_day",
      status,
      markedBy: section.classTeacherId,
      markedAt: `${TODAY}T08:${pad(10 + (attendanceIndex % 20))}:00+05:30`,
      source: "app",
    });
    attendanceIndex += 1;
  }
}

const leaveStaff = [
  teacherStaff[5],
  teacherStaff[9],
  staffByName.get("staff-support-02"),
];

const leaveRequests = [
  {
    id: "leave-001",
    staffId: leaveStaff[0].id,
    fromDate: TODAY,
    toDate: TODAY,
    type: "casual",
    reason: "Family medical appointment.",
    status: "approved",
    approvedBy: headmaster.id,
  },
  {
    id: "leave-002",
    staffId: leaveStaff[1].id,
    fromDate: TODAY,
    toDate: TODAY,
    type: "medical",
    reason: "Viral fever; medical certificate submitted.",
    status: "approved",
    approvedBy: headmaster.id,
  },
  {
    id: "leave-003",
    staffId: leaveStaff[2].id,
    fromDate: TODAY,
    toDate: "2026-11-01",
    type: "casual",
    reason: "Family function.",
    status: "pending",
  },
];

const staffAttendance = staff
  .filter((person) => person.role !== "management")
  .map((person, index) => {
    const leave = leaveRequests.find((request) => request.staffId === person.id);
    const status =
      leave?.status === "approved"
        ? "leave"
        : leave?.status === "pending"
          ? "absent"
          : "present";
    return {
      id: `staff-att-${pad(index + 1, 3)}`,
      staffId: person.id,
      date: TODAY,
      checkIn: status === "present" ? "07:42" : null,
      checkOut: null,
      status,
      note:
        leave?.status === "pending"
          ? "Leave request pending approval."
          : undefined,
    };
  });

const exams = [
  {
    id: "exam-half-2026",
    name: "Half-Yearly Examination",
    term: "Half-Yearly 2026",
    startDate: "2026-09-14",
    endDate: "2026-09-26",
    status: "published",
  },
  {
    id: "exam-annual-2027",
    name: "Annual Examination",
    term: "Annual 2026–27",
    startDate: "2027-11-15",
    endDate: "2027-11-27",
    status: "draft",
    readiness: {
      ready: 7,
      total: 9,
      pending: ["Mathematics · IX", "Physical Science · X"],
    },
  },
];

const examSubjects = [];
let examSubjectIndex = 0;

for (const classLevel of classLevels) {
  subjects.forEach((subject, subjectIndex) => {
    examSubjects.push({
      id: `es-${pad(examSubjectIndex + 1, 3)}`,
      examId: "exam-half-2026",
      classLevel,
      subjectId: subject.id,
      examDate: iso(2026, 9, 14 + subjectIndex),
      maxMarks: 100,
      passMarks: 33,
      theoryMax: 80,
      internalMax: 20,
      practicalMax: 0,
    });
    examSubjectIndex += 1;
  });
}

const marks = [];
let markIndex = 0;

for (const examSubject of examSubjects) {
  const classStudents = students.filter((student) =>
    student.sectionId.startsWith(`${examSubject.classLevel}-`),
  );
  for (const student of classStudents) {
    const ability =
      48 +
      hash(student.id) % 43 +
      (student.attendanceRisk === "chronic" ? -9 : 0);
    const subjectDrop =
      examSubject.subjectId === "math"
        ? 13
        : examSubject.subjectId === "eng"
          ? 8
          : 0;
    const theory = Math.max(
      12,
      Math.min(80, Math.round(ability * 0.8 + subjectDrop + int(-7, 7))),
    );
    const internal = Math.max(
      5,
      Math.min(20, Math.round(ability * 0.2 + int(-3, 3))),
    );
    const forceFail =
      (student.attendanceRisk !== "normal" &&
        (examSubject.subjectId === "math" ||
          examSubject.subjectId === "eng")) ||
      (hash(student.id) % 37 === 0 && examSubject.subjectId === "math") ||
      (hash(student.id) % 41 === 0 && examSubject.subjectId === "eng");
    const finalTheory = forceFail ? Math.min(theory, 18) : theory;
    const finalInternal = forceFail ? Math.min(internal, 7) : internal;
    marks.push({
      id: `mark-${pad(markIndex + 1, 5)}`,
      examSubjectId: examSubject.id,
      studentId: student.id,
      theory: finalTheory,
      internal: finalInternal,
      practical: 0,
      total: finalTheory + finalInternal,
      status: "submitted",
      enteredBy: teacherStaff[markIndex % teacherStaff.length].id,
      updatedAt: "2026-09-30T17:20:00+05:30",
    });
    markIndex += 1;
  }
}

const feeHeads = [
  { id: "fee-exam", code: "EXAM", nameBn: "পরীক্ষা ফি", nameEn: "Examination Fee", frequency: "annual" },
  { id: "fee-session", code: "SESSION", nameBn: "সেশন চার্জ", nameEn: "Session Charge", frequency: "annual" },
  { id: "fee-lab", code: "LAB", nameBn: "ল্যাবরেটরি ফি", nameEn: "Laboratory Fee", frequency: "annual" },
  { id: "fee-library", code: "LIB", nameBn: "লাইব্রেরি ফি", nameEn: "Library Fee", frequency: "annual" },
  { id: "fee-sports", code: "SPORT", nameBn: "ক্রীড়া ফি", nameEn: "Sports Fee", frequency: "annual" },
  { id: "fee-development", code: "DEV", nameBn: "উন্নয়ন ফি", nameEn: "Development Fee", frequency: "annual" },
];

const feeAmounts = {
  "fee-exam": 5000,
  "fee-session": 12000,
  "fee-lab": 8000,
  "fee-library": 3000,
  "fee-sports": 2000,
  "fee-development": 10000,
};

const feeStructures = [];
for (const classLevel of classLevels) {
  for (const head of feeHeads) {
    feeStructures.push({
      id: `fs-${classLevel}-${head.id}`,
      academicYearId: ACADEMIC_YEAR_ID,
      classLevel,
      feeHeadId: head.id,
      amountPaise: feeAmounts[head.id],
      dueDate: "2026-10-25",
    });
  }
}

const bills = [];
const payments = [];
const concessions = [];
const paidStudentIndexes = new Set();
let receiptIndex = 0;

for (let index = 0; index < students.length; index += 1) {
  const student = students[index];
  const dueDate =
    index === 143 || index === 144
      ? "2026-10-01"
      : index < 100
        ? "2026-10-30"
        : index < 145
          ? "2026-10-31"
          : "2026-11-10";
  const items = feeHeads.map((head) => ({
    id: `bi-${index + 1}-${head.id}`,
    feeHeadId: head.id,
    nameBn: head.nameBn,
    nameEn: head.nameEn,
    amountPaise: feeAmounts[head.id],
  }));
  const totalPaise = items.reduce((sum, item) => sum + item.amountPaise, 0);
  const concessionPaise = index >= 200 && index < 212 ? 10000 : 0;

  if (index >= 200 && index < 212) {
    concessions.push({
      id: `con-${pad(index - 199, 3)}`,
      studentId: student.id,
      feeHeadId: "fee-development",
      type: "amount",
      value: 10000,
      reason: "Approved RTE-linked concession for the session.",
      approvedBy: headmaster.id,
      validFrom: "2026-04-01",
      validTo: "2027-03-31",
    });
  }

  let paidPaise = 0;
  if (index < 100) {
    paidPaise = totalPaise - concessionPaise;
    paidStudentIndexes.add(index);
  } else if (index < 110) {
    paidPaise = 25000;
    paidStudentIndexes.add(index);
  }

  if (paidStudentIndexes.has(index)) {
    receiptIndex += 1;
    payments.push({
      id: `pay-${pad(receiptIndex, 4)}`,
      receiptNo: `R-2026-${pad(receiptIndex, 4)}`,
      billId: `bill-${pad(index + 1, 4)}`,
      studentId: student.id,
      amountPaise: paidPaise,
      method: pick(["cash", "upi", "cash"]),
      reference: `TXN-${pad(int(100000, 999999), 6)}`,
      paidAt: `2026-10-${pad(int(5, 30))}T${pad(int(9, 15))}:${pad(int(0, 59))}:00+05:30`,
      collectedBy: clerk.id,
      status: "posted",
    });
  }

  const duePaise = totalPaise - concessionPaise - paidPaise;
  bills.push({
    id: `bill-${pad(index + 1, 4)}`,
    billNo: `BILL/2026/${pad(index + 1, 4)}`,
    studentId: student.id,
    academicYearId: ACADEMIC_YEAR_ID,
    period: "2026–27 · Term 1",
    totalPaise,
    concessionPaise,
    duePaise,
    status: duePaise <= 0 ? "paid" : paidPaise > 0 ? "partial" : "unpaid",
    dueDate,
    items,
  });
}

const salaryStructures = staff
  .filter((person) => person.role !== "management")
  .map((person, index) => {
    const basic =
      person.role === "headmaster"
        ? money(45100)
        : person.role === "teacher"
          ? money(33400)
          : person.role === "clerk"
            ? money(25500)
            : money(18500);
    return {
      id: `sal-struct-${pad(index + 1, 3)}`,
      staffId: person.id,
      basicPayPaise: basic,
      payLevel: person.payLevel,
      daPercent: 12,
      hraPercent: 12,
      medicalPaise: money(1000),
      otherAllowancePaise: person.role === "teacher" ? money(500) : 0,
      standardDeductionPaise: money(3000),
    };
  });

function salaryLineFor(structure, staffId, billId, index, leaveDays) {
  const basic = structure.basicPayPaise;
  const earnings =
    basic +
    Math.round((basic * structure.daPercent) / 100) +
    Math.round((basic * structure.hraPercent) / 100) +
    structure.medicalPaise +
    structure.otherAllowancePaise;
  const leaveAdjustment = Math.round((earnings / 31) * leaveDays * 0.5);
  const deductions = structure.standardDeductionPaise + leaveAdjustment;
  return {
    id: `sal-line-${billId}-${pad(index + 1, 3)}`,
    salaryBillId: billId,
    staffId,
    payableDays: 31 - leaveDays,
    leaveDays,
    earningsPaise: earnings,
    deductionsPaise: deductions,
    netPayPaise: earnings - deductions,
  };
}

const salaryLinesOctober = salaryStructures.map((structure, index) => {
  const line = salaryLineFor(
    structure,
    structure.staffId,
    "salary-2026-10",
    index,
    index % 11 === 0 ? 1 : 0,
  );
  return line;
});

const salaryLinesSeptember = salaryStructures.map((structure, index) => {
  const line = salaryLineFor(
    structure,
    structure.staffId,
    "salary-2026-09",
    index,
    0,
  );
  return line;
});

function billTotals(lines) {
  return {
    totalEarningsPaise: lines.reduce((sum, line) => sum + line.earningsPaise, 0),
    totalDeductionsPaise: lines.reduce(
      (sum, line) => sum + line.deductionsPaise,
      0,
    ),
    netPayPaise: lines.reduce((sum, line) => sum + line.netPayPaise, 0),
  };
}

const octoberTotals = billTotals(salaryLinesOctober);
const septemberTotals = billTotals(salaryLinesSeptember);

const salaryBills = [
  {
    id: "salary-2026-10",
    month: 10,
    year: 2026,
    status: "prepared",
    ...octoberTotals,
    preparedBy: clerk.id,
  },
  {
    id: "salary-2026-09",
    month: 9,
    year: 2026,
    status: "disbursed",
    ...septemberTotals,
    preparedBy: clerk.id,
    verifiedBy: headmaster.id,
    approvedBy: headmaster.id,
    disbursedAt: "2026-09-30T16:10:00+05:30",
  },
];

const notices = [
  {
    id: "notice-001",
    title: "Half-day today",
    bodyEn: "School will close at 12:30 pm today. Buses will leave at 12:45 pm.",
    bodyBn: "আজ দুপুর ১২:৩০-এ বিদ্যালয় ছুটি হবে। বাস ১২:৪৫-এ রওনা দেবে।",
    audience: "all",
    publishedBy: headmaster.id,
    publishedAt: "2026-10-31T07:10:00+05:30",
    status: "published",
  },
  {
    id: "notice-002",
    title: "Class IX exam forms due Monday",
    bodyEn: "Class IX students must submit the examination form by Monday, 2 November.",
    bodyBn: "নবম শ্রেণির শিক্ষার্থীদের সোমবার, ২ নভেম্বরের মধ্যে পরীক্ষার ফর্ম জমা দিতে হবে।",
    audience: "class",
    publishedBy: headmaster.id,
    publishedAt: "2026-10-30T15:30:00+05:30",
    status: "published",
  },
  {
    id: "notice-003",
    title: "Staff meeting",
    bodyEn: "A staff meeting will be held in the library at 3:30 pm today.",
    bodyBn: "আজ বিকেল ৩:৩০-এ লাইব্রেরিতে শিক্ষক-শিক্ষিকা সভা হবে।",
    audience: "teachers",
    publishedBy: headmaster.id,
    publishedAt: "2026-10-31T09:05:00+05:30",
    status: "published",
  },
  {
    id: "notice-004",
    title: "Fire drill",
    bodyEn: "A fire drill will take place on Tuesday at 11:00 am.",
    bodyBn: "মঙ্গলবার সকাল ১১টায় অগ্নিনির্বাপণ মহড়া হবে।",
    audience: "all",
    publishedBy: headmaster.id,
    publishedAt: "2026-10-29T12:00:00+05:30",
    status: "published",
  },
  {
    id: "notice-005",
    title: "Winter uniform from November",
    bodyEn: "Winter uniform is compulsory from 1 November.",
    bodyBn: "১ নভেম্বর থেকে শীতকালীন ইউনিফর্ম বাধ্যতামূলক।",
    audience: "all",
    publishedBy: headmaster.id,
    publishedAt: "2026-10-28T10:20:00+05:30",
    status: "published",
  },
];

const admissions = [
  {
    id: "adm-001",
    applicationNo: "ADM/2027/001",
    nameBn: "ঐশিকী দাস",
    nameEn: "Aishiki Das",
    classApplied: "V",
    guardianName: "তাপস দাস",
    guardianPhone: "9831122001",
    address: "House 42, Kalitala, Nabagram",
    status: "verified",
    documents: [
      { type: "birth_certificate", label: "Birth certificate", verified: true },
      { type: "aadhaar", label: "Aadhaar (masked)", verified: true },
      { type: "previous_report", label: "Previous report card", verified: true },
      { type: "guardian_id", label: "Guardian ID", verified: false },
    ],
    notes: "Guardian ID needs a clearer scan.",
    createdAt: "2026-10-27T11:15:00+05:30",
  },
  {
    id: "adm-002",
    applicationNo: "ADM/2027/002",
    nameBn: "রূপম সরকার",
    nameEn: "Rupam Sarkar",
    classApplied: "V",
    guardianName: "মিঠুন সরকার",
    guardianPhone: "9831122002",
    address: "House 18, School Para, Nabagram",
    status: "submitted",
    documents: [
      { type: "birth_certificate", label: "Birth certificate", verified: true },
      { type: "aadhaar", label: "Aadhaar (masked)", verified: false },
      { type: "previous_report", label: "Previous report card", verified: false },
      { type: "guardian_id", label: "Guardian ID", verified: false },
    ],
    createdAt: "2026-10-28T09:40:00+05:30",
  },
  {
    id: "adm-003",
    applicationNo: "ADM/2027/003",
    nameBn: "মাহিয়া খাতুন",
    nameEn: "Mahia Khatun",
    classApplied: "VI",
    guardianName: "আব্দুল খান",
    guardianPhone: "9831122003",
    address: "House 7, Bazar Para, Nabagram",
    status: "submitted",
    documents: [
      { type: "birth_certificate", label: "Birth certificate", verified: true },
      { type: "aadhaar", label: "Aadhaar (masked)", verified: true },
      { type: "previous_report", label: "Previous report card", verified: false },
      { type: "guardian_id", label: "Guardian ID", verified: false },
    ],
    createdAt: "2026-10-28T13:10:00+05:30",
  },
  {
    id: "adm-004",
    applicationNo: "ADM/2027/004",
    nameBn: "সায়নী পাল",
    nameEn: "Sayani Pal",
    classApplied: "IX",
    guardianName: "সুপ্রভাত পাল",
    guardianPhone: "9831122004",
    address: "House 65, Natun Pally, Nabagram",
    status: "approved",
    documents: [
      { type: "birth_certificate", label: "Birth certificate", verified: true },
      { type: "aadhaar", label: "Aadhaar (masked)", verified: true },
      { type: "previous_report", label: "Previous report card", verified: true },
      { type: "guardian_id", label: "Guardian ID", verified: true },
    ],
    decision: "Approved for IX A; roll to be assigned at admission.",
    createdAt: "2026-10-20T10:20:00+05:30",
  },
  {
    id: "adm-005",
    applicationNo: "ADM/2027/005",
    nameBn: "অর্ণব মণ্ডল",
    nameEn: "Arnab Mondal",
    classApplied: "V",
    guardianName: "সঞ্জয় মণ্ডল",
    guardianPhone: "9831122005",
    address: "House 12, Dakshin Para, Nabagram",
    status: "waitlisted",
    documents: [
      { type: "birth_certificate", label: "Birth certificate", verified: true },
      { type: "aadhaar", label: "Aadhaar (masked)", verified: true },
      { type: "previous_report", label: "Previous report card", verified: false },
      { type: "guardian_id", label: "Guardian ID", verified: false },
    ],
    decision: "Waitlisted — section capacity.",
    createdAt: "2026-10-18T14:45:00+05:30",
  },
  {
    id: "adm-006",
    applicationNo: "ADM/2027/006",
    nameBn: "তনুশ্রী ঘোষ",
    nameEn: "Tanushree Ghosh",
    classApplied: "VIII",
    guardianName: "গৌতম ঘোষ",
    guardianPhone: "9831122006",
    address: "House 33, Purba Para, Nabagram",
    status: "verified",
    documents: [
      { type: "birth_certificate", label: "Birth certificate", verified: true },
      { type: "aadhaar", label: "Aadhaar (masked)", verified: true },
      { type: "previous_report", label: "Previous report card", verified: true },
      { type: "guardian_id", label: "Guardian ID", verified: true },
    ],
    createdAt: "2026-10-26T16:20:00+05:30",
  },
];

const audit = [
  {
    id: "audit-001",
    actorId: teacherStaff[0].id,
    action: "attendance.submitted",
    entityType: "attendance",
    entityId: "VIII-A",
    summary: "Attendance submitted for VIII A · 43 present, 2 absent",
    createdAt: "2026-10-31T10:18:00+05:30",
  },
  {
    id: "audit-002",
    actorId: clerk.id,
    action: "fee.payment.collected",
    entityType: "payment",
    entityId: "pay-0001",
    summary: "Fee payment received · ₹400 · Receipt R-2026-0001",
    createdAt: "2026-10-31T10:06:00+05:30",
  },
  {
    id: "audit-003",
    actorId: clerk.id,
    action: "salary.prepared",
    entityType: "salary_bill",
    entityId: "salary-2026-10",
    summary: "Monthly salary bill prepared for October 2026",
    createdAt: "2026-10-31T09:52:00+05:30",
  },
  {
    id: "audit-004",
    actorId: headmaster.id,
    action: "notice.published",
    entityType: "notice",
    entityId: "notice-001",
    summary: "Notice published · Half-day today",
    createdAt: "2026-10-31T07:10:00+05:30",
  },
  {
    id: "audit-005",
    actorId: clerk.id,
    action: "admission.verified",
    entityType: "admission",
    entityId: "adm-001",
    summary: "Documents verified for ADM/2027/001",
    createdAt: "2026-10-30T16:40:00+05:30",
  },
  {
    id: "audit-006",
    actorId: headmaster.id,
    action: "exam.published",
    entityType: "exam",
    entityId: "exam-half-2026",
    summary: "Half-Yearly Examination results published",
    createdAt: "2026-10-10T15:30:00+05:30",
  },
];

function hash(value) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

function attendanceHistory(seed, risk) {
  const random = mulberry32(seed);
  const weeks = [];
  for (let week = 0; week < 12; week += 1) {
    let row = "";
    for (let day = 0; day < 6; day += 1) {
      if (week === 11 && day === 5) {
        row += "-";
        continue;
      }
      const value = random();
      if (risk === "chronic") {
        row += value < 0.6 ? "P" : value < 0.88 ? "A" : value < 0.96 ? "L" : "H";
      } else if (risk === "low") {
        row += value < 0.78 ? "P" : value < 0.92 ? "A" : value < 0.97 ? "L" : "H";
      } else {
        row += value < 0.94 ? "P" : value < 0.97 ? "A" : value < 0.99 ? "L" : "H";
      }
    }
    weeks.push(row);
  }
  return weeks;
}

const database = {
  school,
  academicYear,
  sections,
  subjects,
  staff,
  students,
  admissions,
  attendance,
  staffAttendance,
  leaveRequests,
  timetable,
  substitutions,
  exams,
  examSubjects,
  marks,
  feeHeads,
  feeStructures,
  bills,
  payments,
  concessions,
  salaryStructures,
  salaryBills,
  salaryLines: [...salaryLinesOctober, ...salaryLinesSeptember],
  notices,
  audit,
};

const teacherSection = sections.find((section) => section.id === "VIII-B");
const teacherStudents = studentsBySection.get("VIII-B");
const absentTeacherIds = new Set(
  staffAttendance
    .filter((record) => record.status === "leave" || record.status === "absent")
    .map((record) => record.staffId),
);
const teacherTodayTimetable = timetable.filter(
  (entry) => entry.day === "SAT" && entry.teacherId === ananya.id,
);
const teacherFreePeriods = PERIOD_TIMES.slice(0, SATURDAY_PERIODS)
  .filter(
    (period) =>
      !teacherTodayTimetable.some((entry) => entry.period === period.period),
  )
  .map((period) => period.period);
const teacherCoverBoard = timetable
  .filter((entry) => entry.day === "SAT" && absentTeacherIds.has(entry.teacherId))
  .map((entry) => {
    const subject = subjects.find((item) => item.id === entry.subjectId);
    const absentTeacher = staffByName.get(entry.teacherId);
    const substitution = substitutions.find(
      (item) =>
        item.date === TODAY &&
        item.period === entry.period &&
        item.sectionId === entry.sectionId,
    );
    const substitute = substitution
      ? staffByName.get(substitution.substituteTeacherId)
      : null;
    return {
      entryId: entry.id,
      period: entry.period,
      start: entry.start,
      end: entry.end,
      sectionId: entry.sectionId,
      subjectId: entry.subjectId,
      subjectNameBn: subject?.nameBn ?? "",
      subjectNameEn: subject?.nameEn ?? "",
      room: entry.room,
      absentTeacherId: entry.teacherId,
      absentTeacherNameBn: absentTeacher?.nameBn ?? "",
      absentTeacherNameEn: absentTeacher?.nameEn ?? "",
      absentTeacherAvatar: absentTeacher?.avatar ?? "",
      substituteTeacherId: substitution?.substituteTeacherId ?? null,
      substituteTeacherNameBn: substitute?.nameBn ?? null,
      substituteTeacherNameEn: substitute?.nameEn ?? null,
      status: substitution ? substitution.status : "uncovered",
      availableToAnanya:
        !substitution &&
        !teacherTodayTimetable.some(
          (item) => item.period === entry.period,
        ),
    };
  });

const teacherSeed = {
  school,
  academicYear,
  teacher: ananya,
  section: teacherSection,
  students: teacherStudents.map((student) => ({
    ...student,
    attendanceHistory: attendanceHistory(
      student.attendanceSeed,
      student.attendanceRisk,
    ),
  })),
  subjects,
  periods: PERIOD_TIMES.slice(0, SATURDAY_PERIODS),
  currentPeriod: 4,
  now: "10:26",
  todayTimetable: teacherTodayTimetable,
  freePeriods: teacherFreePeriods,
  coverBoard: teacherCoverBoard,
  substitutions,
  notices: notices.filter(
    (notice) => notice.audience === "all" || notice.audience === "teachers",
  ),
};

const webSeedPath = join(root, "apps/web/src/data/seed.json");
const flutterSeedPath = join(root, "apps/teacher_app/assets/seed/seed.json");
mkdirSync(join(root, "apps/web/src/data"), { recursive: true });
mkdirSync(join(root, "apps/teacher_app/assets/seed"), { recursive: true });
writeFileSync(webSeedPath, JSON.stringify(database, null, 2));
writeFileSync(flutterSeedPath, JSON.stringify(teacherSeed, null, 2));

console.log(`wrote ${webSeedPath}`);
console.log(`wrote ${flutterSeedPath}`);
console.log(
  `students=${students.length} sections=${sections.length} staff=${staff.length} marks=${marks.length} bills=${bills.length} payments=${payments.length} salaryLines=${database.salaryLines.length}`,
);
