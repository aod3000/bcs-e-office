/* ============================================
   staff-data.js - ข้อมูลทำเนียบบุคลากรโรงเรียนบางชัน (ปลื้มวิทยานุสรณ์)
   รองรับรูปภาพจาก Google Drive (ผ่าน GAS) และลิงก์โซเชียลหลายช่องทาง
   ============================================ */

const STAFF_DATA = [
  {
    id: 1,
    name: 'นางชลตวรรณ ขุมเพ็ชร',
    position: 'ผู้อำนวยการโรงเรียน',
    department: 'ผู้บริหารสถานศึกษา',
    category: 'executive',
    image: '', // สามารถใส่ URL จาก Google Drive ได้
    socials: [
      { type: 'facebook', label: 'Facebook', url: 'https://facebook.com', color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white' },
      { type: 'line', label: 'LINE Official', url: 'https://line.me', color: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white' },
      { type: 'email', label: 'อีเมลติดต่อ', url: 'mailto:director@bcs.ac.th', color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-800 hover:text-white' }
    ]
  },
  {
    id: 2,
    name: 'นางสาวกัญญาภัทร นวลเพ็ญ',
    position: 'รองผู้อำนวยการโรงเรียน',
    department: 'กลุ่มบริหารวิชาการ',
    category: 'executive',
    image: '',
    socials: [
      { type: 'facebook', label: 'Facebook', url: 'https://facebook.com', color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white' },
      { type: 'email', label: 'อีเมลวิชาการ', url: 'mailto:academic@bcs.ac.th', color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-800 hover:text-white' }
    ]
  },
  {
    id: 3,
    name: 'นายสมชาย รัตนวิเชียร',
    position: 'รองผู้อำนวยการโรงเรียน',
    department: 'กลุ่มบริหารงานบุคคลและทั่วไป',
    category: 'executive',
    image: '',
    socials: [
      { type: 'facebook', label: 'Facebook', url: 'https://facebook.com', color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white' },
      { type: 'phone', label: 'โทร 02-xxx-xxxx', url: 'tel:020000000', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-600 hover:text-white' }
    ]
  },
  {
    id: 4,
    name: 'ครูหัวหน้ากลุ่มสาระภาษาต่างประเทศ (EP)',
    position: 'ครูชำนาญการพิเศษ',
    department: 'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ',
    category: 'teacher',
    image: '',
    socials: [
      { type: 'facebook', label: 'Facebook', url: 'https://facebook.com', color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white' },
      { type: 'line', label: 'LINE ID', url: 'https://line.me', color: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white' }
    ]
  },
  {
    id: 5,
    name: 'ครูหัวหน้าฝ่ายกิจการนักเรียน / ปกครอง',
    position: 'ครูชำนาญการ',
    department: 'กลุ่มบริหารกิจการนักเรียน',
    category: 'discipline',
    image: '',
    socials: [
      { type: 'facebook', label: 'Facebook', url: 'https://facebook.com', color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white' },
      { type: 'phone', label: 'สายตรงฝ่ายปกครอง', url: 'tel:020000000', color: 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-600 hover:text-white' }
    ]
  }
];
