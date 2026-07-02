// Supabase Configuration
// 복사해오신 Supabase URL과 Public Anon Key를 여기에 입력해 주세요.
const SUPABASE_URL = "https://hcplbxcopsuvptlamasi.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_ZU61y-0Zzd5OO0a0-ccPXQ_GkZ-p8sL"; 

let supabaseClient = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.error("Supabase client initialization failed:", e);
    }
}

// Global State
let students = [];
let exceptions = {}; // exceptions = { "YYYY-MM-DD": [ { studentName, type, startHour, endHour, hasMeal }, ... ] }
let currentView = 'weekly'; // 'weekly' or 'monthly'
let selectedYear = 2026;
let selectedMonth = 7;
let activeDate = null; // currently editing date string "YYYY-MM-DD"
let activeDateShifts = []; // shifts being edited in modal
let editingShiftIndex = -1; // -1 means add mode, >=0 means edit mode
let isAdmin = false; // Admin authorization state (default guest mode)

// Predefined colors for students (15 highly vibrant and saturated colors)
const studentColors = [
    { bg: '#ef4444', text: '#ffffff', border: '#b91c1c' }, // 1. Ruby Red (빨강)
    { bg: '#f97316', text: '#ffffff', border: '#c2410c' }, // 2. Sunset Orange (주황)
    { bg: '#f59e0b', text: '#1e293b', border: '#b45309' }, // 3. Amber Yellow (노랑)
    { bg: '#84cc16', text: '#1e293b', border: '#4d7c0f' }, // 4. Bright Lime (연두)
    { bg: '#22c55e', text: '#ffffff', border: '#15803d' }, // 5. Vibrant Green (초록)
    { bg: '#10b981', text: '#ffffff', border: '#047857' }, // 6. Emerald Teal (청록)
    { bg: '#06b6d4', text: '#ffffff', border: '#0369a1' }, // 7. Electric Cyan (시안)
    { bg: '#0ea5e9', text: '#ffffff', border: '#0284c7' }, // 8. Deep Sky Blue (하늘)
    { bg: '#3b82f6', text: '#ffffff', border: '#1d4ed8' }, // 9. Ocean Blue (파랑)
    { bg: '#6366f1', text: '#ffffff', border: '#4338ca' }, // 10. Royal Indigo (남색)
    { bg: '#a855f7', text: '#ffffff', border: '#7e22ce' }, // 11. Bright Purple (보라)
    { bg: '#d946ef', text: '#ffffff', border: '#a21caf' }, // 12. Electric Magenta (자주)
    { bg: '#ec4899', text: '#ffffff', border: '#be185d' }, // 13. Hot Pink (분홍)
    { bg: '#f43f5e', text: '#ffffff', border: '#be123c' }, // 14. Crimson Rose (장미)
    { bg: '#64748b', text: '#ffffff', border: '#334155' }  // 15. Slate Gray (회색)
];

// Hash function to get a stable color for each student name (fallback)
function getStudentColor(student) {
    if (student && student.colorIndex !== undefined && student.colorIndex !== -1) {
        return studentColors[student.colorIndex];
    }
    const name = student ? (student.name || '') : '';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % studentColors.length;
    return studentColors[index];
}

function getStudentColorByName(name) {
    const student = students.find(s => s.name === name);
    return getStudentColor(student);
}

// Sample Data corresponding to the handwriting image
const BACKUP_DEFAULT_DATA = {
    "students": [
        {
            "id": "s1",
            "name": "이은지",
            "type": "집중",
            "colorIndex": 12,
            "schedules": [
                {
                    "days": [
                        "월",
                        "화",
                        "수",
                        "토",
                        "일"
                    ],
                    "startHour": 9,
                    "endHour": 14,
                    "hasMeal": false
                }
            ],
            "isVariable": false
        },
        {
            "id": "s2",
            "name": "이은혜",
            "type": "집중",
            "colorIndex": 8,
            "schedules": [
                {
                    "days": [
                        "월",
                        "수"
                    ],
                    "startHour": 9,
                    "endHour": 12,
                    "hasMeal": false
                },
                {
                    "days": [
                        "화",
                        "일"
                    ],
                    "startHour": 9,
                    "endHour": 14,
                    "hasMeal": false
                },
                {
                    "days": [
                        "토"
                    ],
                    "startHour": 9,
                    "endHour": 18,
                    "hasMeal": true
                }
            ],
            "isVariable": false
        },
        {
            "id": "s3",
            "name": "강혜서",
            "type": "집중",
            "colorIndex": 9,
            "schedules": [
                {
                    "days": [
                        "월",
                        "화",
                        "수"
                    ],
                    "startHour": 12,
                    "endHour": 17,
                    "hasMeal": false
                },
                {
                    "days": [
                        "목"
                    ],
                    "startHour": 9,
                    "endHour": 13,
                    "hasMeal": false
                },
                {
                    "days": [
                        "일"
                    ],
                    "startHour": 9,
                    "endHour": 18,
                    "hasMeal": true
                }
            ],
            "isVariable": false
        },
        {
            "id": "s4",
            "name": "정수효",
            "type": "집중",
            "colorIndex": 2,
            "schedules": [
                {
                    "days": [
                        "월",
                        "화",
                        "수"
                    ],
                    "startHour": 14,
                    "endHour": 18,
                    "hasMeal": false
                },
                {
                    "days": [
                        "목"
                    ],
                    "startHour": 9,
                    "endHour": 18,
                    "hasMeal": true
                },
                {
                    "days": [
                        "일"
                    ],
                    "startHour": 13,
                    "endHour": 17,
                    "hasMeal": false
                }
            ],
            "isVariable": false
        },
        {
            "id": "s5",
            "name": "황도연",
            "type": "집중",
            "colorIndex": 1,
            "schedules": [
                {
                    "days": [
                        "월"
                    ],
                    "startHour": 9,
                    "endHour": 16,
                    "hasMeal": false
                },
                {
                    "days": [
                        "화",
                        "수"
                    ],
                    "startHour": 9,
                    "endHour": 15,
                    "hasMeal": false
                },
                {
                    "days": [
                        "토"
                    ],
                    "startHour": 9,
                    "endHour": 18,
                    "hasMeal": true
                }
            ],
            "isVariable": false
        },
        {
            "id": "s6",
            "name": "황준서",
            "type": "집중",
            "colorIndex": 11,
            "schedules": [
                {
                    "days": [
                        "월",
                        "화",
                        "목"
                    ],
                    "startHour": 9,
                    "endHour": 12,
                    "hasMeal": false
                },
                {
                    "days": [
                        "토"
                    ],
                    "startHour": 9,
                    "endHour": 18,
                    "hasMeal": true
                },
                {
                    "days": [
                        "일"
                    ],
                    "startHour": 13,
                    "endHour": 18,
                    "hasMeal": false
                }
            ],
            "isVariable": false
        },
        {
            "id": "s7",
            "name": "노우찬",
            "type": "학기중",
            "colorIndex": 3,
            "schedules": [
                {
                    "days": [
                        "월",
                        "수"
                    ],
                    "startHour": 14,
                    "endHour": 22,
                    "hasMeal": false
                },
                {
                    "days": [
                        "화",
                        "목"
                    ],
                    "startHour": 14,
                    "endHour": 18,
                    "hasMeal": false
                },
                {
                    "days": [
                        "토"
                    ],
                    "startHour": 9,
                    "endHour": 12,
                    "hasMeal": false
                }
            ],
            "isVariable": false
        },
        {
            "id": "s8",
            "name": "김보민",
            "type": "학기중",
            "colorIndex": 1,
            "schedules": [
                {
                    "days": [
                        "월",
                        "화",
                        "수",
                        "목"
                    ],
                    "startHour": 9,
                    "endHour": 15,
                    "hasMeal": false
                }
            ],
            "isVariable": false
        },
        {
            "id": "s9",
            "name": "조재영",
            "type": "학기중",
            "colorIndex": 13,
            "schedules": [],
            "isVariable": true
        },
        {
            "id": "s10",
            "name": "명하은",
            "type": "학기중",
            "colorIndex": 10,
            "schedules": [
                {
                    "days": [
                        "월",
                        "화",
                        "수",
                        "목"
                    ],
                    "startHour": 18,
                    "endHour": 22,
                    "hasMeal": false
                },
                {
                    "days": [
                        "일"
                    ],
                    "startHour": 9,
                    "endHour": 18,
                    "hasMeal": true
                }
            ],
            "isVariable": false
        },
        {
            "id": "s11",
            "name": "박하민",
            "type": "학기중",
            "colorIndex": 10,
            "schedules": [
                {
                    "days": [
                        "월",
                        "수"
                    ],
                    "startHour": 12,
                    "endHour": 17,
                    "hasMeal": false
                },
                {
                    "days": [
                        "화",
                        "목"
                    ],
                    "startHour": 13,
                    "endHour": 22,
                    "hasMeal": true
                }
            ],
            "isVariable": false
        },
        {
            "id": "s12",
            "name": "정유리",
            "type": "학기중",
            "colorIndex": 10,
            "schedules": [
                {
                    "days": [
                        "월",
                        "화",
                        "수",
                        "목"
                    ],
                    "startHour": 16,
                    "endHour": 22,
                    "hasMeal": false
                }
            ],
            "isVariable": false
        },
        {
            "id": "s13",
            "name": "윤철현",
            "type": "학기중",
            "colorIndex": 5,
            "schedules": [
                {
                    "days": [
                        "월",
                        "화",
                        "수",
                        "목"
                    ],
                    "startHour": 17,
                    "endHour": 22,
                    "hasMeal": false
                },
                {
                    "days": [
                        "일"
                    ],
                    "startHour": 15,
                    "endHour": 18,
                    "hasMeal": false
                }
            ],
            "isVariable": false
        },
        {
            "id": "s14",
            "name": "정지수",
            "type": "학기중",
            "colorIndex": 5,
            "schedules": [
                {
                    "days": [
                        "월",
                        "목"
                    ],
                    "startHour": 10,
                    "endHour": 16,
                    "hasMeal": false
                },
                {
                    "days": [
                        "화"
                    ],
                    "startHour": 10,
                    "endHour": 17,
                    "hasMeal": false
                },
                {
                    "days": [
                        "일"
                    ],
                    "startHour": 12,
                    "endHour": 18,
                    "hasMeal": false
                }
            ],
            "isVariable": false
        }
    ],
    "exceptions": {
        "2026-07-01": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            }
        ],
        "2026-07-02": [
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 9,
                "endHour": 13,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "황준서",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 13,
                "endHour": 22,
                "hasMeal": true
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 10,
                "endHour": 16,
                "hasMeal": false
            }
        ],
        "2026-07-03": [],
        "2026-07-04": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "황준서",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            }
        ],
        "2026-07-05": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 13,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "황준서",
                "type": "집중",
                "startHour": 13,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 15,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 12,
                "endHour": 18,
                "hasMeal": false
            }
        ],
        "2026-07-06": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "황준서",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 10,
                "endHour": 16,
                "hasMeal": false
            }
        ],
        "2026-07-07": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "황준서",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 13,
                "endHour": 22,
                "hasMeal": true
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 10,
                "endHour": 17,
                "hasMeal": false
            }
        ],
        "2026-07-08": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            }
        ],
        "2026-07-09": [
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 9,
                "endHour": 13,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "황준서",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 13,
                "endHour": 22,
                "hasMeal": true
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 10,
                "endHour": 16,
                "hasMeal": false
            }
        ],
        "2026-07-10": [],
        "2026-07-11": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "황준서",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            }
        ],
        "2026-07-12": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 13,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "황준서",
                "type": "집중",
                "startHour": 13,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 15,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 12,
                "endHour": 18,
                "hasMeal": false
            }
        ],
        "2026-07-13": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 16,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 10,
                "endHour": 16,
                "hasMeal": false
            }
        ],
        "2026-07-14": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 13,
                "endHour": 22,
                "hasMeal": true
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 10,
                "endHour": 17,
                "hasMeal": false
            }
        ],
        "2026-07-15": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            }
        ],
        "2026-07-16": [
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 9,
                "endHour": 13,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 13,
                "endHour": 22,
                "hasMeal": true
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 10,
                "endHour": 16,
                "hasMeal": false
            }
        ],
        "2026-07-17": [],
        "2026-07-18": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            }
        ],
        "2026-07-19": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 15,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 12,
                "endHour": 18,
                "hasMeal": false
            }
        ],
        "2026-07-20": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 16,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 10,
                "endHour": 16,
                "hasMeal": false
            }
        ],
        "2026-07-21": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 13,
                "endHour": 22,
                "hasMeal": true
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 10,
                "endHour": 17,
                "hasMeal": false
            }
        ],
        "2026-07-22": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            }
        ],
        "2026-07-23": [
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 9,
                "endHour": 13,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 13,
                "endHour": 22,
                "hasMeal": true
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 10,
                "endHour": 16,
                "hasMeal": false
            }
        ],
        "2026-07-24": [],
        "2026-07-25": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "황준서",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            }
        ],
        "2026-07-26": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 13,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 15,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 12,
                "endHour": 18,
                "hasMeal": false
            }
        ],
        "2026-07-27": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 16,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 10,
                "endHour": 16,
                "hasMeal": false
            }
        ],
        "2026-07-28": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "황준서",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 13,
                "endHour": 22,
                "hasMeal": true
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 10,
                "endHour": 17,
                "hasMeal": false
            }
        ],
        "2026-07-29": [
            {
                "studentName": "이은지",
                "type": "집중",
                "startHour": 9,
                "endHour": 14,
                "hasMeal": false
            },
            {
                "studentName": "이은혜",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "황도연",
                "type": "집중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 12,
                "endHour": 17,
                "hasMeal": false
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            }
        ],
        "2026-07-30": [
            {
                "studentName": "강혜서",
                "type": "집중",
                "startHour": 9,
                "endHour": 13,
                "hasMeal": false
            },
            {
                "studentName": "정수효",
                "type": "집중",
                "startHour": 9,
                "endHour": 18,
                "hasMeal": true
            },
            {
                "studentName": "황준서",
                "type": "집중",
                "startHour": 9,
                "endHour": 12,
                "hasMeal": false
            },
            {
                "studentName": "노우찬",
                "type": "학기중",
                "startHour": 14,
                "endHour": 18,
                "hasMeal": false
            },
            {
                "studentName": "김보민",
                "type": "학기중",
                "startHour": 9,
                "endHour": 15,
                "hasMeal": false
            },
            {
                "studentName": "명하은",
                "type": "학기중",
                "startHour": 18,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "박하민",
                "type": "학기중",
                "startHour": 13,
                "endHour": 22,
                "hasMeal": true
            },
            {
                "studentName": "정유리",
                "type": "학기중",
                "startHour": 16,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "윤철현",
                "type": "학기중",
                "startHour": 17,
                "endHour": 22,
                "hasMeal": false
            },
            {
                "studentName": "정지수",
                "type": "학기중",
                "startHour": 10,
                "endHour": 16,
                "hasMeal": false
            }
        ],
        "2026-07-31": []
    }
};

const SAMPLE_TEXT = `(집중) 홍길동 월화수토일 9-14
(집중) 김철수 월수 9-12, 화일 9-14, 토 9-18 (식사)
(집중) 이영희 월화수 12-17, 목 9-13, 일 9-18 (식사)
(집중) 박민수 월화수 14-18, 목 9-18 (식사), 일 14-18
(집중) 최지우 월화수 9-13, 토 9-18 (식사)
(집중) 정민재 월화목 9-12, 토 9-18 (식사), 일 13-18
(학기중) 강동원 월수 14-22, 화목 14-18, 토 9-12
(학기중) 한효주 월화수목 9-15
(학기중) 송중기 변동성
(학기중) 김태희 월화수목 18-22, 일 9-18 (식사)
(학기중) 유재석 월수 12-17, 화목 13-22 (식사)
(학기중) 신민아 월화수목 16-22
(학기중) 이광수 월화수목 17-22, 일 15-18
(학기중) 임윤아 월화수 10-14, 토 11-18, 일 12-18`;

// DOM Elements
const textInput = document.getElementById('text-input');
const btnParse = document.getElementById('btn-parse');
const btnLoadSample = document.getElementById('btn-load-sample');
const btnExportExcel = document.getElementById('btn-export-excel');
const btnClearAll = document.getElementById('btn-clear-all');
const studentTableBody = document.getElementById('student-table-body');
const studentCountLabel = document.getElementById('student-count');
const intensiveHoursList = document.getElementById('intensive-hours-list');
const semesterHoursList = document.getElementById('semester-hours-list');

// Add student form elements
const studentForm = document.getElementById('student-form');
const formName = document.getElementById('form-name');
const formType = document.getElementById('form-type');
const btnAddStudent = document.getElementById('btn-add-student');
const formMeal = document.getElementById('form-meal');
const formStartTime = document.getElementById('form-start-time');
const formEndTime = document.getElementById('form-end-time');

// View & Tab Controllers
const tabWeekly = document.getElementById('tab-weekly');
const tabMonthly = document.getElementById('tab-monthly');
const monthSelectorArea = document.getElementById('month-selector-area');
const calendarPanel = document.getElementById('calendar-panel');
const timetablePanel = document.querySelector('.timetable-panel');
const calendarTitleLabel = document.getElementById('calendar-title-label');
const selectYear = document.getElementById('select-year');
const selectMonth = document.getElementById('select-month');
const calendarDaysContainer = document.getElementById('calendar-days-container');

// Modal Elements
const dateModal = document.getElementById('date-modal');
const modalDateTitle = document.getElementById('modal-date-title');
const modalTodayStudents = document.getElementById('modal-today-students');
const modalAddStudentSelect = document.getElementById('modal-add-student');
const modalAddStart = document.getElementById('modal-add-start');
const modalAddEnd = document.getElementById('modal-add-end');
const modalAddMeal = document.getElementById('modal-add-meal');
const btnModalAddShift = document.getElementById('btn-modal-add-shift');
const btnModalSave = document.getElementById('btn-modal-save');
const btnModalCancel = document.getElementById('btn-modal-cancel');
const btnModalRevert = document.getElementById('btn-modal-revert');
const btnCloseModal = document.getElementById('btn-close-modal');

// Auth DOM Elements
const btnAdminLogin = document.getElementById('btn-admin-login');
const btnAdminLogout = document.getElementById('btn-admin-logout');
const loginModal = document.getElementById('login-modal');
const btnCloseLoginModal = document.getElementById('btn-close-login-modal');
const btnLoginCancel = document.getElementById('btn-login-cancel');
const btnLoginSubmit = document.getElementById('btn-login-submit');
const loginPassword = document.getElementById('login-password');
const loginUsername = document.getElementById('login-username');

const btnChangePassword = document.getElementById('btn-change-password');
const passwordModal = document.getElementById('password-modal');
const btnClosePasswordModal = document.getElementById('btn-close-password-modal');
const btnPasswordCancel = document.getElementById('btn-password-cancel');
const btnPasswordSubmit = document.getElementById('btn-password-submit');
const newPassword = document.getElementById('new-password');
const newPasswordConfirm = document.getElementById('new-password-confirm');

// Load data (Try server first, then fallback to LocalStorage)
// Helper to check if Supabase is reachable under 2.0s timeout (prevents hang on secure networks)
async function isSupabaseReachable() {
    if (!supabaseClient) return false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    try {
        // Fetch a tiny query from our table using the anon key to test actual access without causing 404
        const pingUrl = `${SUPABASE_URL}/rest/v1/timetable_store?select=id&limit=1`;
        const res = await fetch(pingUrl, { 
            method: 'GET', 
            headers: { 
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            signal: controller.signal 
        });
        clearTimeout(timeoutId);
        return res.ok;
    } catch (e) {
        clearTimeout(timeoutId);
        console.warn("Supabase is unreachable (secure network or offline):", e.message);
        return false;
    }
}

async function loadData() {
    // Check Auth State first
    isAdmin = sessionStorage.getItem('work_study_admin_logged_in') === 'true';
    applyAuthorizationUI();

    let loadedSuccessfully = false;

    // Only attempt Supabase fetch if it is reachable (prevents blocking)
    if (supabaseClient && await isSupabaseReachable()) {
        try {
            const { data, error } = await supabaseClient
                .from('timetable_store')
                .select('students, exceptions')
                .eq('id', 1)
                .single();
                
            if (error) {
                console.error('Failed to load from Supabase:', error);
            } else if (data) {
                students = data.students || [];
                exceptions = data.exceptions || {};
                
                // If cloud database is empty, load backup data
                if (students.length === 0) {
                    students = BACKUP_DEFAULT_DATA.students || [];
                    exceptions = BACKUP_DEFAULT_DATA.exceptions || {};
                    saveData();
                }
                loadedSuccessfully = true;
            }
        } catch (e) {
            console.error('Supabase load failed with exception:', e);
        }
    }

    if (loadedSuccessfully) {
        updateUI();
        return;
    }

    // Local Server Fallback
    if (window.location.protocol.startsWith('http')) {
        try {
            const res = await fetch('/api/data');
            if (res.ok) {
                const data = await res.json();
                students = data.students || [];
                exceptions = data.exceptions || {};
                if (students.length === 0) {
                    students = BACKUP_DEFAULT_DATA.students || [];
                    exceptions = BACKUP_DEFAULT_DATA.exceptions || {};
                    saveData();
                }
                updateUI();
                return;
            }
        } catch (err) {
            console.warn('Failed to load from server, using local storage instead:', err);
        }
    }
    
    // Pure Local Storage Fallback
    let saved = localStorage.getItem('work_study_students');
    let savedExceptions = localStorage.getItem('work_study_exceptions');
    
    // Automatically purge old mock data (like 홍길동) to force load the correct reconstructed dataset
    if (saved && saved.includes('홍길동')) {
        localStorage.removeItem('work_study_students');
        localStorage.removeItem('work_study_exceptions');
        localStorage.removeItem('work_study_populated');
        saved = null;
        savedExceptions = null;
        console.log("Purged legacy sample data.");
    }
    
    try {
        students = saved ? JSON.parse(saved) : [];
        exceptions = savedExceptions ? JSON.parse(savedExceptions) : {};
    } catch(e) {
        students = [];
        exceptions = {};
    }
    
    if (students.length === 0) {
        students = BACKUP_DEFAULT_DATA.students || [];
        exceptions = BACKUP_DEFAULT_DATA.exceptions || {};
        saveData();
    }
    
    updateUI();
}

// Silent parsing of SAMPLE_TEXT to pre-populate empty database
function parseInputTextSilent() {
    const lines = SAMPLE_TEXT.split('\n');
    const parsedStudents = [];
    const scheduleRegex = /([월화수목금토일]+)\s*(\d{1,2})\s*[-~]\s*(\d{1,2})(?:\s*\(?식사(?:[가-힣\s]*)\)?)?/g;

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        let type = '학기중';
        if (line.includes('집중')) {
            type = '집중';
        } else if (line.includes('학기중') || line.includes('학기') || line.includes('국가')) {
            type = '학기중';
        }

        let cleanLine = line.replace(/[\(\[\{]?(집중|학기중|학기|국가)[\)\]\}]?/g, '').trim();
        const nameMatch = cleanLine.match(/^([가-힣a-zA-Z0-9]+)/);
        if (!nameMatch) return;

        const name = nameMatch[1];
        const schedules = [];
        let match;
        const scheduleStr = cleanLine.substring(name.length).trim();
        const isVariable = /변동|고정시간\s*X/i.test(line);

        scheduleRegex.lastIndex = 0;
        while ((match = scheduleRegex.exec(scheduleStr)) !== null) {
            const dayStr = match[1];
            const startHour = parseInt(match[2], 10);
            const endHour = parseInt(match[3], 10);
            const hasMeal = match[0].includes('식사');
            const days = dayStr.split('');
            
            schedules.push({
                days: days,
                startHour: startHour,
                endHour: endHour,
                hasMeal: hasMeal
            });
        }

        parsedStudents.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            name: name,
            type: type,
            schedules: schedules,
            isVariable: isVariable
        });
    });

    students = parsedStudents;
    exceptions = {};
    saveData();
    updateUI();
}

async function saveData() {
    // 1. Save to browser LocalStorage (always)
    localStorage.setItem('work_study_students', JSON.stringify(students));
    localStorage.setItem('work_study_exceptions', JSON.stringify(exceptions));

    // 2. Save to Supabase if connected
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('timetable_store')
                .update({
                    students: students,
                    exceptions: exceptions,
                    updated_at: new Date().toISOString()
                })
                .eq('id', 1);
                
            if (error) {
                console.error('Failed to save to Supabase:', error);
            }
        } catch (e) {
            console.error('Supabase save error:', e);
        }
    }

    // 3. Save to local server file if served via HTTP
    if (window.location.protocol.startsWith('http')) {
        try {
            await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ students, exceptions })
            });
        } catch (err) {
            console.error('Failed to sync with local server:', err);
        }
    }
}

// UI Initialization
window.addEventListener('DOMContentLoaded', () => {
    loadData();
    initFormColorPicker();
    initTabEvents();
    initModalEvents();
    initStudentModalEvents();
    initAuthEvents();
    initCurrentWorkersEvents();
    
    const btnImportLocal = document.getElementById('btn-import-local');
    if (btnImportLocal) {
        btnImportLocal.addEventListener('click', importLocalStorageToServer);
    }
    
    const btnApplyWeeklyToMonth = document.getElementById('btn-apply-weekly-to-month');
    const btnApplyWeeklyToMonthWeeklyTab = document.getElementById('btn-apply-weekly-to-month-weekly-tab');
    const btnClearMonth = document.getElementById('btn-clear-month');
    if (btnApplyWeeklyToMonth) {
        btnApplyWeeklyToMonth.addEventListener('click', applyWeeklySchedulesToMonth);
    }
    if (btnApplyWeeklyToMonthWeeklyTab) {
        btnApplyWeeklyToMonthWeeklyTab.addEventListener('click', applyWeeklySchedulesToMonth);
    }
    if (btnClearMonth) {
        btnClearMonth.addEventListener('click', clearMonthlySchedules);
    }
    
    // Bind buttons
    btnLoadSample.addEventListener('click', () => {
        if (textInput.value.trim() && textInput.value !== SAMPLE_TEXT) {
            if (!confirm('입력 창에 작성 중인 내용이 있습니다. 샘플 데이터로 교체하시겠습니까? (이 시점에서는 데이터베이스가 초기화되지 않습니다.)')) {
                return;
            }
        }
        textInput.value = SAMPLE_TEXT;
    });
    
    btnParse.addEventListener('click', parseInputText);
    btnClearAll.addEventListener('click', clearAllStudents);
    btnAddStudent.addEventListener('click', addSingleStudent);
    btnExportExcel.addEventListener('click', exportToExcel);
    
    const btnExportImage = document.getElementById('btn-export-image');
    if (btnExportImage) {
        btnExportImage.addEventListener('click', exportToImage);
    }
});

// Tab & View change binding
function initTabEvents() {
    tabWeekly.addEventListener('click', () => {
        currentView = 'weekly';
        tabWeekly.classList.add('active');
        tabMonthly.classList.remove('active');
        monthSelectorArea.style.display = 'none';
        timetablePanel.style.display = 'block';
        calendarPanel.style.display = 'none';
        
        // Update summary headers
        document.querySelector('#intensive-hours-list').previousElementSibling.textContent = '집중근로 주 근무시간';
        document.querySelector('#semester-hours-list').previousElementSibling.textContent = '학기중근로 주 근무시간';
        document.querySelector('.summary-panel .panel-header h2').textContent = '📊 주간 근무시간 집계';
        updateUI();
    });

    tabMonthly.addEventListener('click', () => {
        currentView = 'monthly';
        tabMonthly.classList.add('active');
        tabWeekly.classList.remove('active');
        monthSelectorArea.style.display = 'flex';
        timetablePanel.style.display = 'none';
        calendarPanel.style.display = 'block';
        
        // Update summary headers
        document.querySelector('#intensive-hours-list').previousElementSibling.textContent = '집중근로 월 근무시간';
        document.querySelector('#semester-hours-list').previousElementSibling.textContent = '학기중근로 월 근무시간';
        updateSummaryHeaderWithMonth();
        updateUI();
    });

    selectYear.addEventListener('change', (e) => {
        selectedYear = parseInt(e.target.value, 10);
        updateSummaryHeaderWithMonth();
        updateUI();
    });

    selectMonth.addEventListener('change', (e) => {
        selectedMonth = parseInt(e.target.value, 10);
        updateSummaryHeaderWithMonth();
        updateUI();
    });
}

function updateSummaryHeaderWithMonth() {
    document.querySelector('.summary-panel .panel-header h2').textContent = `📊 월간 근무시간 집계 (${selectedYear}년 ${selectedMonth}월)`;
}

// Clear all data
function clearAllStudents() {
    if (!isAdmin) return;
    if (confirm('정말로 모든 학생 데이터와 월간 일정 변경 내역을 삭제하시겠습니까?')) {
        students = [];
        exceptions = {};
        saveData();
        updateUI();
    }
}

function parseInputText() {
    if (!isAdmin) return;
    const text = textInput.value.trim();
    if (!text) {
        alert('입력된 텍스트가 없습니다. 내용을 작성하거나 샘플을 로드해 주세요.');
        return;
    }

    // Safety check: Warn user before overwriting their active database
    if (students.length > 0) {
        if (!confirm('새로운 텍스트 데이터를 반영하면 현재 등록된 모든 학생 명단 및 시간표 데이터가 덮어쓰여 초기화됩니다. 계속하시겠습니까?')) {
            return;
        }
    }

    const lines = text.split('\n');
    const parsedStudents = [];

    // Schedule parsing regex
    const scheduleRegex = /([월화수목금토일]+)\s*(\d{1,2})\s*[-~]\s*(\d{1,2})(?:\s*\(?식사(?:[가-힣\s]*)\)?)?/g;

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // Extract Type: (집중) or (학기중). Default is 학기중 if not specified.
        let type = '학기중';
        if (line.includes('집중')) {
            type = '집중';
        } else if (line.includes('학기중') || line.includes('학기') || line.includes('국가')) {
            type = '학기중';
        }

        // Clean type tags to extract name easily
        let cleanLine = line.replace(/[\(\[\{]?(집중|학기중|학기|국가)[\)\]\}]?/g, '').trim();

        // Extract Name: First word in cleanLine
        const nameMatch = cleanLine.match(/^([가-힣a-zA-Z0-9]+)/);
        if (!nameMatch) return;

        const name = nameMatch[1];
        
        // Parse schedules
        const schedules = [];
        let match;
        const scheduleStr = cleanLine.substring(name.length).trim();
        
        // Check if variable schedule (변동성)
        const isVariable = /변동|고정시간\s*X/i.test(line);

        // Reset regex lastIndex
        scheduleRegex.lastIndex = 0;
        
        while ((match = scheduleRegex.exec(scheduleStr)) !== null) {
            const dayStr = match[1];
            const startHour = parseInt(match[2], 10);
            const endHour = parseInt(match[3], 10);
            const hasMeal = match[0].includes('식사');

            // Split dayStr into individual days
            const days = dayStr.split('');
            
            schedules.push({
                days: days,
                startHour: startHour,
                endHour: endHour,
                hasMeal: hasMeal
            });
        }

        parsedStudents.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            name: name,
            type: type,
            schedules: schedules,
            isVariable: isVariable
        });
    });

    if (parsedStudents.length === 0) {
        alert('올바른 스케줄 정보를 찾지 못했습니다. 형식을 확인해 주세요.');
        return;
    }

    students = parsedStudents;
    saveData();
    updateUI();
}

// Add student from manual form
function addSingleStudent() {
    if (!isAdmin) return;
    const name = formName.value.trim();
    if (!name) {
        alert('이름을 입력하세요.');
        return;
    }

    const type = formType.value;
    const colorIndex = parseInt(document.getElementById('form-color-index').value, 10);
    
    // Check days selected
    const checkedDays = Array.from(document.querySelectorAll('.days-checkboxes input:checked')).map(cb => cb.value);
    const startHour = parseInt(formStartTime.value, 10);
    const endHour = parseInt(formEndTime.value, 10);
    const hasMeal = formMeal.checked;

    if (checkedDays.length === 0) {
        alert('근무 요일을 최소 하나 이상 선택하세요.');
        return;
    }

    if (startHour >= endHour) {
        alert('종료 시간이 시작 시간보다 커야 합니다.');
        return;
    }

    // Check if student already exists
    let student = students.find(s => s.name === name);
    if (!student) {
        student = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            name: name,
            type: type,
            schedules: [],
            isVariable: false,
            colorIndex: colorIndex
        };
        students.push(student);
    } else {
        // Update type and color if found
        student.type = type;
        student.colorIndex = colorIndex;
    }

    // Add schedule block
    student.schedules.push({
        days: checkedDays,
        startHour: startHour,
        endHour: endHour,
        hasMeal: hasMeal
    });

    // Reset Form fields (except name)
    document.querySelectorAll('.days-checkboxes input').forEach(cb => cb.checked = false);
    formMeal.checked = false;
    formStartTime.value = 9;
    formEndTime.value = 18;
    selectFormColor(-1); // Reset selected color index to auto

    saveData();
    updateUI();
}

// Delete student schedule block or student
function deleteStudent(studentId) {
    if (!isAdmin) return;
    students = students.filter(s => s.id !== studentId);
    saveData();
    updateUI();
}

// Calculate weekly working hours for a student
function calculateWeeklyHours(student) {
    if (student.isVariable) return 0;
    
    let total = 0;
    student.schedules.forEach(sched => {
        const hoursPerDay = Math.max(0, sched.endHour - sched.startHour - (sched.hasMeal ? 1 : 0));
        total += sched.days.length * hoursPerDay;
    });
    return total;
}

// Calculate monthly working hours for a student
function calculateMonthlyHours(student, year, month) {
    let total = 0;
    const numDays = new Date(year, month, 0).getDate();
    for (let d = 1; d <= numDays; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const daySchedules = getSchedulesForDate(dateStr);
        daySchedules.forEach(sched => {
            if (sched.studentName === student.name) {
                const hours = Math.max(0, sched.endHour - sched.startHour - (sched.hasMeal ? 1 : 0));
                total += hours;
            }
        });
    }
    return total;
}

// Resolve schedule shifts for a specific date (incorporating exceptions)
function getSchedulesForDate(dateStr) {
    if (exceptions[dateStr] !== undefined) {
        return exceptions[dateStr];
    }
    
    // By default, the monthly calendar starts empty (no auto-generation from weekly shifts)
    return [];
}

// Update the Entire User Interface
function updateUI() {
    renderStudentList();
    renderHoursSummary();
    if (currentView === 'weekly') {
        renderTimetables();
    } else {
        renderCalendar();
    }
}

// Render Database list table
function renderStudentList() {
    studentCountLabel.textContent = students.length;
    
    if (students.length === 0) {
        studentTableBody.innerHTML = `
            <tr>
                <td colspan="${isAdmin ? 5 : 4}" class="empty-table-msg">데이터를 입력하여 시간표를 구성해보세요!</td>
            </tr>
        `;
        return;
    }

    studentTableBody.innerHTML = '';
    
    students.forEach(student => {
        const tr = document.createElement('tr');
        
        // Type Badge (clickable to toggle type only if admin)
        const typeBadge = isAdmin 
            ? `<span class="badge-type ${student.type === '집중' ? 'intensive' : 'semester'}" style="cursor: pointer;" title="클릭하여 구분 변경 (집중 ↔ 학기중)" onclick="toggleStudentType('${student.id}')">${student.type}근로</span>`
            : `<span class="badge-type ${student.type === '집중' ? 'intensive' : 'semester'}">${student.type}근로</span>`;
        
        // Student color
        const color = getStudentColor(student);

        // Schedules Text representation
        let scheduleText = '';
        if (student.isVariable) {
            scheduleText = '<span class="schedule-pill">변동성 (고정시간 없음)</span>';
        } else {
            scheduleText = student.schedules.map(sched => {
                const dayStr = sched.days.join('');
                const mealStr = sched.hasMeal ? ' (식사)' : '';
                return `<span class="schedule-pill ${sched.hasMeal ? 'meal' : ''}">${dayStr} ${sched.startHour}-${sched.endHour}${mealStr}</span>`;
            }).join(' ');
        }

        const totalHours = currentView === 'weekly' ? calculateWeeklyHours(student) : calculateMonthlyHours(student, selectedYear, selectedMonth);
        const hoursDisplay = student.isVariable && currentView === 'weekly' ? '변동성' : `${totalHours}시간`;

        const colorBtn = isAdmin
            ? `<button class="color-preview-btn" style="background-color: ${color.bg}; border-color: ${color.border};" onclick="toggleColorDropdown(event, '${student.id}')"></button>
               <div id="color-dropdown-${student.id}" class="color-dropdown-content">
                   ${studentColors.map((c, idx) => `
                       <span class="color-opt-circle" style="background-color: ${c.bg}; border-color: ${c.border};" onclick="changeStudentColor('${student.id}', ${idx})"></span>
                   `).join('')}
               </div>`
            : `<div class="color-preview-btn" style="background-color: ${color.bg}; border-color: ${color.border}; cursor: default;"></div>`;

        const actionTd = isAdmin
            ? `<td>
                   <div class="action-buttons">
                       <button class="btn btn-secondary btn-sm" onclick="editStudent('${student.id}')">수정</button>
                       <button class="btn btn-danger btn-sm" onclick="deleteStudent('${student.id}')">삭제</button>
                   </div>
               </td>`
            : '';

        tr.innerHTML = `
            <td>${typeBadge}</td>
            <td>
                <div class="student-name-container">
                    <div class="color-picker-wrapper">
                        ${colorBtn}
                    </div>
                    <strong>${student.name}</strong>
                </div>
            </td>
            <td><div class="schedules-container">${scheduleText}</div></td>
            <td><span class="student-val">${hoursDisplay}</span></td>
            ${actionTd}
        `;
        studentTableBody.appendChild(tr);
    });
}

// Render Hours Summary Cards (Weekly or Monthly depending on current tab)
function renderHoursSummary() {
    intensiveHoursList.innerHTML = '';
    semesterHoursList.innerHTML = '';

    const intensiveStudents = students.filter(s => s.type === '집중');
    const semesterStudents = students.filter(s => s.type === '학기중');

    if (intensiveStudents.length === 0) {
        intensiveHoursList.innerHTML = '<div class="no-data">등록된 집중근로 학생이 없습니다.</div>';
    } else {
        intensiveStudents.sort((a,b) => {
            const hrsA = currentView === 'weekly' ? calculateWeeklyHours(a) : calculateMonthlyHours(a, selectedYear, selectedMonth);
            const hrsB = currentView === 'weekly' ? calculateWeeklyHours(b) : calculateMonthlyHours(b, selectedYear, selectedMonth);
            return hrsB - hrsA || a.name.localeCompare(b.name);
        });
        intensiveStudents.forEach(s => {
            const hours = currentView === 'weekly' ? calculateWeeklyHours(s) : calculateMonthlyHours(s, selectedYear, selectedMonth);
            const item = document.createElement('div');
            item.className = 'hour-item intensive';
            item.innerHTML = `
                <span class="student-name">${s.name}</span>
                <span class="student-val">${s.isVariable && currentView === 'weekly' ? '변동성' : `${hours}h`}</span>
            `;
            intensiveHoursList.appendChild(item);
        });
    }

    if (semesterStudents.length === 0) {
        semesterHoursList.innerHTML = '<div class="no-data">등록된 학기중근로 학생이 없습니다.</div>';
    } else {
        semesterStudents.sort((a,b) => {
            const hrsA = currentView === 'weekly' ? calculateWeeklyHours(a) : calculateMonthlyHours(a, selectedYear, selectedMonth);
            const hrsB = currentView === 'weekly' ? calculateWeeklyHours(b) : calculateMonthlyHours(b, selectedYear, selectedMonth);
            return hrsB - hrsA || a.name.localeCompare(b.name);
        });
        semesterStudents.forEach(s => {
            const hours = currentView === 'weekly' ? calculateWeeklyHours(s) : calculateMonthlyHours(s, selectedYear, selectedMonth);
            const item = document.createElement('div');
            item.className = 'hour-item semester';
            item.innerHTML = `
                <span class="student-name">${s.name}</span>
                <span class="student-val">${s.isVariable && currentView === 'weekly' ? '변동성' : `${hours}h`}</span>
            `;
            semesterHoursList.appendChild(item);
        });
    }
}

// Render Visual Weekly Schedule Cards
function renderTimetables() {
    const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];
    
    daysOfWeek.forEach(day => {
        const blocksContainer = document.getElementById(`blocks-${day}`);
        const gridContentArea = document.getElementById(`grid-content-${day}`);
        const timeAxis = gridContentArea.previousElementSibling;
        const gridBg = gridContentArea.querySelector('.grid-bg');

        blocksContainer.innerHTML = '';
        timeAxis.innerHTML = '';
        gridBg.innerHTML = '';

        // 1. Gather all schedule blocks for this day
        const dayBlocks = [];
        students.forEach(student => {
            if (student.isVariable) return;
            student.schedules.forEach(sched => {
                if (sched.days.includes(day)) {
                    dayBlocks.push({
                        studentName: student.name,
                        type: student.type,
                        startHour: sched.startHour,
                        endHour: sched.endHour,
                        hasMeal: sched.hasMeal
                    });
                }
            });
        });

        // 2. Determine day range (dynamic start/end hours)
        const isWeekend = (day === '토' || day === '일');
        let dayStart = 9;
        let dayEnd = isWeekend ? 18 : 22;

        dayBlocks.forEach(b => {
            if (b.startHour < dayStart) dayStart = Math.max(0, b.startHour);
            if (b.endHour > dayEnd) dayEnd = Math.min(24, b.endHour);
        });

        const totalHours = dayEnd - dayStart;

        // 3. Render time axis labels
        for (let h = dayStart; h <= dayEnd; h++) {
            const label = document.createElement('div');
            label.className = 'time-slot-label';
            label.style.height = `calc(100% / ${totalHours})`;
            label.textContent = `${String(h).padStart(2, '0')}:00`;
            timeAxis.appendChild(label);
        }

        // 4. Render background grid rows
        for (let i = 0; i < totalHours; i++) {
            const row = document.createElement('div');
            row.className = 'grid-bg-row';
            gridBg.appendChild(row);
        }

        // 5. Layout overlapping blocks
        dayBlocks.sort((a, b) => a.startHour - b.startHour || (b.endHour - b.startHour) - (a.endHour - a.startHour));

        const columnEnds = [];
        const assignedBlocks = dayBlocks.map(block => {
            let colIndex = 0;
            while (colIndex < columnEnds.length && columnEnds[colIndex] > block.startHour) {
                colIndex++;
            }
            columnEnds[colIndex] = block.endHour;
            return {
                ...block,
                colIndex: colIndex
            };
        });

        const maxCols = Math.max(1, columnEnds.length);
        blocksContainer.style.gridTemplateColumns = `repeat(${maxCols}, 1fr)`;
        blocksContainer.style.gridTemplateRows = `repeat(${totalHours}, 1fr)`;

        // 6. Render blocks
        assignedBlocks.forEach(block => {
            const element = document.createElement('div');
            element.className = 'schedule-block';
            
            const color = getStudentColorByName(block.studentName);
            element.style.backgroundColor = color.bg;
            element.style.color = color.text;
            element.style.borderColor = color.border;

            const startRow = block.startHour - dayStart + 1;
            const endRow = block.endHour - dayStart + 1;
            element.style.gridColumn = `${block.colIndex + 1} / span 1`;
            element.style.gridRow = `${startRow} / ${endRow}`;

            const mealLabel = block.hasMeal ? '<span class="block-meal">식사</span>' : '';
            element.title = `${block.studentName} (${block.startHour}시 ~ ${block.endHour}시${block.hasMeal ? ', 식사 차감' : ''})`;
            element.innerHTML = `
                <div class="block-name">${block.studentName}</div>
                <div class="block-time">${block.startHour}-${block.endHour}</div>
                ${mealLabel}
            `;
            
            blocksContainer.appendChild(element);
        });
    });
}

// Render Monthly Calendar Grid
function renderCalendar() {
    calendarTitleLabel.textContent = `${selectedYear}년 ${selectedMonth}월`;
    calendarDaysContainer.innerHTML = '';

    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0: Sun, 1: Mon...
    const numDays = new Date(selectedYear, selectedMonth, 0).getDate();

    // 1. Fill empty cells for previous month padding
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day-cell empty';
        calendarDaysContainer.appendChild(emptyCell);
    }

    // 2. Render actual day cells
    for (let d = 1; d <= numDays; d++) {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dateObj = new Date(selectedYear, selectedMonth - 1, d);
        const dayOfWeek = dateObj.getDay(); // 0: Sun, 6: Sat
        
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';
        if (dayOfWeek === 0) cell.classList.add('Sunday');
        if (dayOfWeek === 6) cell.classList.add('Saturday');

        // Check exceptions
        const isCustomized = exceptions[dateStr] !== undefined;
        if (isCustomized) {
            cell.classList.add('has-exceptions');
        }

        // Get schedules for this date
        const dayShifts = getSchedulesForDate(dateStr);

        // Header for day number
        const dayNumElem = document.createElement('div');
        dayNumElem.className = 'day-number';
        dayNumElem.innerHTML = `${d}${isCustomized ? ' <span style="color:var(--primary); font-size:0.6rem;">✏️</span>' : ''}`;
        cell.appendChild(dayNumElem);

        // List container for student pills
        const pillsList = document.createElement('div');
        pillsList.className = 'day-pills-list';

        dayShifts.forEach(shift => {
            const color = getStudentColorByName(shift.studentName);
            const pill = document.createElement('div');
            pill.className = 'calendar-student-pill';
            pill.dataset.type = shift.type; // Save type for filtering on image export
            pill.style.backgroundColor = color.bg;
            pill.style.color = color.text;
            pill.style.borderColor = color.border;
            pill.title = `${shift.studentName} (${shift.startHour}-${shift.endHour}${shift.hasMeal ? ', 식사' : ''})`;
            
            const mealChar = shift.hasMeal ? '🍽️' : '';
            pill.innerHTML = `<span>${shift.studentName}</span> <span>${shift.startHour}-${shift.endHour}${mealChar}</span>`;
            pillsList.appendChild(pill);
        });

        cell.appendChild(pillsList);
        
        // Add click handler to edit date schedule
        cell.addEventListener('click', () => openDateModal(dateStr));

        calendarDaysContainer.appendChild(cell);
    }
}

// ----------------------------------------------------
// POPUP MODAL LOGIC (DATE SPECIFIC EDIT)
// ----------------------------------------------------
function initModalEvents() {
    btnCloseModal.addEventListener('click', closeModal);
    btnModalCancel.addEventListener('click', closeModal);
    btnModalAddShift.addEventListener('click', addShiftInModal);
    btnModalSave.addEventListener('click', saveModalChanges);
    btnModalRevert.addEventListener('click', revertModalToBase);
    
    const btnCancelEdit = document.getElementById('btn-modal-cancel-edit');
    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', (e) => {
            e.preventDefault();
            cancelEditShiftInModal();
        });
    }
}

function openDateModal(dateStr) {
    activeDate = dateStr;
    activeDateShifts = [...getSchedulesForDate(dateStr)];
    
    // Parse Date details
    const dateObj = new Date(dateStr);
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const weekday = dayNames[dateObj.getDay()];
    
    modalDateTitle.textContent = `${selectedYear}년 ${selectedMonth}월 ${dateObj.getDate()}일 (${weekday}) 일정 편집`;
    
    // Populate Modal Student Select Option
    modalAddStudentSelect.innerHTML = '';
    students.forEach(s => {
        const option = document.createElement('option');
        option.value = s.name;
        option.textContent = `[${s.type}근로] ${s.name}`;
        modalAddStudentSelect.appendChild(option);
    });

    // Reset Modal Form Add Shift
    modalAddStart.value = 9;
    modalAddEnd.value = 18;
    modalAddMeal.checked = false;

    renderModalTodayShifts();
    
    // Show Modal
    dateModal.classList.add('show');
}

function closeModal() {
    dateModal.classList.remove('show');
    activeDate = null;
    activeDateShifts = [];
    cancelEditShiftInModal(); // Cleanly reset edit index and restore form labels
}

// Render student list currently working on the active date inside modal
function renderModalTodayShifts() {
    modalTodayStudents.innerHTML = '';
    
    if (activeDateShifts.length === 0) {
        modalTodayStudents.innerHTML = '<div class="no-data">오늘 근무하는 학생이 없습니다.</div>';
        return;
    }

    activeDateShifts.forEach((shift, index) => {
        const item = document.createElement('div');
        item.className = 'modal-student-item';
        
        const color = getStudentColorByName(shift.studentName);
        item.style.borderLeftColor = color.bg;
        
        const mealText = shift.hasMeal ? ' (식사 감면 1h)' : '';
        const actionSpan = isAdmin
            ? `<span style="margin: 0 0.5rem; color: var(--border-color);">|</span>
               <button type="button" class="btn-edit-shift" onclick="startEditShiftInModal(${index})" style="background: none; border: none; color: var(--accent); cursor: pointer; font-size: 0.8rem; padding: 0 0.25rem;">수정</button>
               <span style="margin: 0 0.25rem; color: var(--border-color);">|</span>
               <button type="button" class="btn-remove-shift" onclick="removeShiftInModal(${index})">삭제</button>`
            : '';

        item.innerHTML = `
            <div class="student-details">
                <span class="badge-type ${shift.type === '집중' ? 'intensive' : 'semester'}">${shift.type}</span>
                <strong>${shift.studentName}</strong>
            </div>
            <div class="student-actions">
                <span class="student-time">${shift.startHour}:00 ~ ${shift.endHour}:00${mealText}</span>
                ${actionSpan}
            </div>
        `;
        modalTodayStudents.appendChild(item);
    });
}

function removeShiftInModal(index) {
    if (!isAdmin) return;
    if (editingShiftIndex === index) {
        cancelEditShiftInModal();
    }
    activeDateShifts.splice(index, 1);
    renderModalTodayShifts();
}

function addShiftInModal() {
    if (!isAdmin) return;
    const studentName = modalAddStudentSelect.value;
    if (!studentName) {
        alert('근무를 지정할 학생을 선택하세요.');
        return;
    }

    const start = parseInt(modalAddStart.value, 10);
    const end = parseInt(modalAddEnd.value, 10);
    const meal = modalAddMeal.checked;

    if (start >= end) {
        alert('종료 시간이 시작 시간보다 커야 합니다.');
        return;
    }

    // Find student details
    const student = students.find(s => s.name === studentName);
    if (!student) return;

    // Check if student has overlapping shift today (excluding the item currently being edited)
    const overlap = activeDateShifts.find((s, idx) => {
        if (idx === editingShiftIndex) return false;
        if (s.studentName !== studentName) return false;
        return (start < s.endHour) && (end > s.startHour);
    });

    if (overlap) {
        alert(`${studentName} 학생은 오늘 이미 겹치는 시간대(${overlap.startHour}시 ~ ${overlap.endHour}시)에 일정이 등록되어 있습니다.`);
        return;
    }

    if (editingShiftIndex !== -1) {
        // Edit mode: Update existing element
        activeDateShifts[editingShiftIndex] = {
            studentName: student.name,
            type: student.type,
            startHour: start,
            endHour: end,
            hasMeal: meal
        };
    } else {
        // Add mode: Push new element
        activeDateShifts.push({
            studentName: student.name,
            type: student.type,
            startHour: start,
            endHour: end,
            hasMeal: meal
        });
    }

    cancelEditShiftInModal();
    renderModalTodayShifts();
}

function saveModalChanges() {
    if (!isAdmin) return;
    exceptions[activeDate] = activeDateShifts;
    saveData();
    closeModal();
    updateUI();
}

function revertModalToBase() {
    if (!isAdmin) return;
    if (confirm('이 일자의 일정을 요일별 기본 고정 일정으로 복원하시겠습니까?')) {
        const dateObj = new Date(activeDate);
        const weekdayChar = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
        
        const daySchedules = [];
        students.forEach(student => {
            if (student.isVariable) return;
            student.schedules.forEach(sched => {
                if (sched.days.includes(weekdayChar)) {
                    daySchedules.push({
                        studentName: student.name,
                        type: student.type,
                        startHour: sched.startHour,
                        endHour: sched.endHour,
                        hasMeal: sched.hasMeal
                    });
                }
            });
        });
        
        exceptions[activeDate] = daySchedules;
        saveData();
        closeModal();
        updateUI();
    }
}

// Bind to window for inline list deletions
window.removeShiftInModal = removeShiftInModal;
window.startEditShiftInModal = startEditShiftInModal;
window.cancelEditShiftInModal = cancelEditShiftInModal;

function startEditShiftInModal(index) {
    const shift = activeDateShifts[index];
    if (!shift) return;

    editingShiftIndex = index;

    // Populate inputs
    modalAddStudentSelect.value = shift.studentName;
    modalAddStart.value = shift.startHour;
    modalAddEnd.value = shift.endHour;
    modalAddMeal.checked = shift.hasMeal;

    // Toggle labels
    const formTitle = document.getElementById('modal-form-title');
    const cancelEditBtn = document.getElementById('btn-modal-cancel-edit');
    const addBtn = document.getElementById('btn-modal-add-shift');

    if (formTitle) formTitle.querySelector('span').textContent = '✏️ 근무 수정';
    if (cancelEditBtn) cancelEditBtn.style.display = 'inline';
    if (addBtn) addBtn.textContent = '오늘 일정 수정 완료';

    // Highlight item
    const items = modalTodayStudents.querySelectorAll('.modal-student-item');
    items.forEach((item, idx) => {
        if (idx === index) {
            item.style.backgroundColor = 'rgba(99, 102, 241, 0.12)';
            item.style.borderLeftWidth = '5px';
        } else {
            item.style.backgroundColor = '';
            item.style.borderLeftWidth = '';
        }
    });
}

function cancelEditShiftInModal() {
    editingShiftIndex = -1;

    // Reset inputs
    if (modalAddStudentSelect.options.length > 0) {
        modalAddStudentSelect.selectedIndex = 0;
    }
    modalAddStart.value = 9;
    modalAddEnd.value = 18;
    modalAddMeal.checked = false;

    // Toggle labels back
    const formTitle = document.getElementById('modal-form-title');
    const cancelEditBtn = document.getElementById('btn-modal-cancel-edit');
    const addBtn = document.getElementById('btn-modal-add-shift');

    if (formTitle) formTitle.querySelector('span').textContent = '➕ 근무 추가';
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
    if (addBtn) addBtn.textContent = '오늘 일정에 추가';

    // Remove highlight
    const items = modalTodayStudents.querySelectorAll('.modal-student-item');
    items.forEach(item => {
        item.style.backgroundColor = '';
        item.style.borderLeftWidth = '';
    });
}

// ----------------------------------------------------
// EXCEL EXPORT ENGINE USING EXCELJS
// ----------------------------------------------------
async function exportToExcel() {
    if (students.length === 0) {
        alert('다운로드할 데이터가 없습니다. 먼저 데이터를 추가해 주세요.');
        return;
    }

    try {
        const workbook = new ExcelJS.Workbook();
        
        // Colors
        const primaryColor = 'FF1E293B'; // Header Fill
        const headerTextColor = 'FFFFFFFF'; // Header Text
        const gridBorderColor = 'FFCBD5E1'; // Light Slate border
        const weekendColor = 'FFF1F5F9'; // Gray-100 for weekend background
        
        if (currentView === 'weekly') {
            // ----------------------------------------------------
            // WEEKLY EXPORT CODE
            // ----------------------------------------------------
            const ws1 = workbook.addWorksheet('시간표 및 근무시간');
            ws1.views = [{ showGridLines: true }];

            ws1.columns = [
                { key: 'time', width: 16 }, // A
                { key: 'mon', width: 18 },  // B
                { key: 'tue', width: 18 },  // C
                { key: 'wed', width: 18 },  // D
                { key: 'thu', width: 18 },  // E
                { key: 'fri', width: 18 },  // F
                { key: 'sat', width: 18 },  // G
                { key: 'sun', width: 18 },  // H
                { key: 'space1', width: 3 }, // I
                { key: 'intName', width: 12 }, // J
                { key: 'intHrs', width: 10 },  // K
                { key: 'space2', width: 3 },  // L
                { key: 'natName', width: 12 }, // M
                { key: 'natHrs', width: 10 }   // N
            ];

            ws1.mergeCells('A1:H1');
            const titleCell = ws1.getCell('A1');
            titleCell.value = '학기중근로 및 집중근로학생 시간표 (요일별 기본 스케줄)';
            titleCell.font = { name: '맑은 고딕', size: 14, bold: true, color: { argb: 'FF1E1B4B' } };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            ws1.getRow(1).height = 40;

            const headers = ['시간', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
            const headerRow = ws1.getRow(3);
            headerRow.height = 28;
            
            headers.forEach((header, index) => {
                const colLetter = String.fromCharCode(65 + index);
                const cell = ws1.getCell(`${colLetter}3`);
                cell.value = header;
                cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: headerTextColor } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'medium', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF475569' } },
                    right: { style: 'thin', color: { argb: 'FF475569' } }
                };
            });

            for (let i = 0; i < 13; i++) {
                const startH = 9 + i;
                const endH = 10 + i;
                const timeLabel = `${String(startH).padStart(2, '0')}:00 ~ ${String(endH).padStart(2, '0')}:00`;
                const excelRowIndex = 4 + i;
                const row = ws1.getRow(excelRowIndex);
                row.height = 36;
                
                const timeCell = ws1.getCell(`A${excelRowIndex}`);
                timeCell.value = timeLabel;
                timeCell.font = { name: '맑은 고딕', size: 9, bold: true, color: { argb: 'FF475569' } };
                timeCell.alignment = { horizontal: 'center', vertical: 'middle' };
                timeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                timeCell.border = {
                    top: { style: 'thin', color: { argb: gridBorderColor } },
                    bottom: { style: 'thin', color: { argb: gridBorderColor } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: gridBorderColor } }
                };

                const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];
                daysOfWeek.forEach((day, dIdx) => {
                    const colLetter = String.fromCharCode(66 + dIdx);
                    const cell = ws1.getCell(`${colLetter}${excelRowIndex}`);
                    
                    const activeStudents = [];
                    students.forEach(student => {
                        if (student.isVariable) return;
                        student.schedules.forEach(sched => {
                            if (sched.days.includes(day) && startH >= sched.startHour && endH <= sched.endHour) {
                                const mealText = sched.hasMeal ? '(식사)' : '';
                                activeStudents.push(`${student.name}${mealText}`);
                            }
                        });
                    });

                    if (activeStudents.length > 0) {
                        cell.value = activeStudents.join('\n');
                        
                        let fillCol = 'FFE2E8F0';
                        let textCol = 'FF1E293B';
                        
                        if (activeStudents.length === 1) {
                            const nameOnly = activeStudents[0].split('(')[0];
                            const colInfo = getStudentColorByName(nameOnly);
                            if (colInfo) {
                                fillCol = colInfo.bg.replace('#', 'FF').toUpperCase();
                                textCol = colInfo.text.replace('#', 'FF').toUpperCase();
                            }
                        }
                        
                        cell.font = { name: '맑은 고딕', size: 9, color: { argb: textCol }, bold: true };
                        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillCol } };
                    } else {
                        const isWeekend = (day === '토' || day === '일');
                        if (isWeekend && startH >= 18) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                        } else {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                        }
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }

                    cell.border = {
                        top: { style: 'thin', color: { argb: gridBorderColor } },
                        bottom: { style: 'thin', color: { argb: gridBorderColor } },
                        left: { style: 'thin', color: { argb: gridBorderColor } },
                        right: { style: 'thin', color: { argb: (dIdx === 6 ? 'FF000000' : gridBorderColor) } }
                    };
                });
            }

            ws1.getRow(16).eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= 8) {
                    cell.border = {
                        ...cell.border,
                        bottom: { style: 'medium', color: { argb: 'FF000000' } }
                    };
                }
            });

            // Summary Tables
            ws1.mergeCells('J3:K3');
            const intHead = ws1.getCell('J3');
            intHead.value = '집중근로 주 근무시간';
            intHead.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            intHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
            intHead.alignment = { horizontal: 'center', vertical: 'middle' };
            
            ws1.mergeCells('M3:N3');
            const natHead = ws1.getCell('M3');
            natHead.value = '학기중근로 주 근무시간';
            natHead.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            natHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
            natHead.alignment = { horizontal: 'center', vertical: 'middle' };

            ws1.getCell('J4').value = '이름';
            ws1.getCell('K4').value = '근무시간';
            ws1.getCell('M4').value = '이름';
            ws1.getCell('N4').value = '근무시간';
            
            const subHeaders = ['J4', 'K4', 'M4', 'N4'];
            subHeaders.forEach(cellRef => {
                const cell = ws1.getCell(cellRef);
                cell.font = { name: '맑은 고딕', size: 9, bold: true, color: { argb: 'FF475569' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FF475569' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });

            const intStudents = students.filter(s => s.type === '집중')
                .sort((a,b) => calculateWeeklyHours(b) - calculateWeeklyHours(a) || a.name.localeCompare(b.name));
            const natStudents = students.filter(s => s.type === '학기중')
                .sort((a,b) => calculateWeeklyHours(b) - calculateWeeklyHours(a) || a.name.localeCompare(b.name));

            const maxSummaryRows = Math.max(intStudents.length, natStudents.length);
            let intTotal = 0;
            let natTotal = 0;

            for (let i = 0; i < maxSummaryRows; i++) {
                const sumRowIdx = 5 + i;
                if (i < intStudents.length) {
                    const s = intStudents[i];
                    const hours = calculateWeeklyHours(s);
                    intTotal += hours;
                    ws1.getCell(`J${sumRowIdx}`).value = s.name;
                    ws1.getCell(`K${sumRowIdx}`).value = s.isVariable ? '변동성' : hours;
                }
                if (i < natStudents.length) {
                    const s = natStudents[i];
                    const hours = calculateWeeklyHours(s);
                    natTotal += hours;
                    ws1.getCell(`M${sumRowIdx}`).value = s.name;
                    ws1.getCell(`N${sumRowIdx}`).value = s.isVariable ? '변동성' : hours;
                }

                ['J', 'K', 'M', 'N'].forEach(col => {
                    const cell = ws1.getCell(`${col}${sumRowIdx}`);
                    cell.font = { name: '맑은 고딕', size: 9 };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                });
            }

            const totalRowIdx = 5 + maxSummaryRows;
            ws1.getCell(`J${totalRowIdx}`).value = '합계';
            ws1.getCell(`K${totalRowIdx}`).value = intTotal;
            ws1.getCell(`M${totalRowIdx}`).value = '합계';
            ws1.getCell(`N${totalRowIdx}`).value = natTotal;

            ['J', 'K', 'M', 'N'].forEach(col => {
                const cell = ws1.getCell(`${col}${totalRowIdx}`);
                cell.font = { name: '맑은 고딕', size: 9, bold: true, color: { argb: 'FF1E293B' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'medium', color: { argb: 'FF475569' } },
                    bottom: { style: 'double', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });

        } else {
            // ----------------------------------------------------
            // MONTHLY CALENDAR EXPORT CODE
            // ----------------------------------------------------
            const ws1 = workbook.addWorksheet(`${selectedMonth}월 시간표`);
            ws1.views = [{ showGridLines: true }];

            ws1.columns = [
                { key: 'sun', width: 18 }, // A: Sunday
                { key: 'mon', width: 18 }, // B: Monday
                { key: 'tue', width: 18 }, // C: Tuesday
                { key: 'wed', width: 18 }, // D: Wednesday
                { key: 'thu', width: 18 }, // E: Thursday
                { key: 'fri', width: 18 }, // F: Friday
                { key: 'sat', width: 18 }, // G: Saturday
                { key: 'space1', width: 3 }, // H: Spacer
                { key: 'intName', width: 12 }, // I: Intensive Name
                { key: 'intHrs', width: 10 },  // J: Intensive Hours
                { key: 'space2', width: 3 },  // K: Spacer
                { key: 'natName', width: 12 }, // L: National Name
                { key: 'natHrs', width: 10 }   // M: National Hours
            ];

            // 1. Title
            ws1.mergeCells('A1:G1');
            const titleCell = ws1.getCell('A1');
            titleCell.value = `${selectedYear}년 ${selectedMonth}월 근무 시간표 (달력형)`;
            titleCell.font = { name: '맑은 고딕', size: 14, bold: true, color: { argb: 'FF1E1B4B' } };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            ws1.getRow(1).height = 40;

            // 2. Weekdays Header
            const weekdayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
            const headerRow = ws1.getRow(3);
            headerRow.height = 24;
            weekdayNames.forEach((name, idx) => {
                const colLetter = String.fromCharCode(65 + idx);
                const cell = ws1.getCell(`${colLetter}3`);
                cell.value = name;
                cell.font = { name: '맑은 고딕', size: 9, bold: true, color: { argb: headerTextColor } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                
                if (idx === 0) cell.fill.fgColor = { argb: 'FFEF4444' }; // Highlight Sunday Red
                if (idx === 6) cell.fill.fgColor = { argb: 'FF0284C7' }; // Highlight Saturday Blue
                
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'medium', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF475569' } },
                    right: { style: 'thin', color: { argb: 'FF475569' } }
                };
            });

            // 3. Calendar Grid loop
            let currentDay = 1;
            const numDays = new Date(selectedYear, selectedMonth, 0).getDate();
            const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0 to 6
            
            let excelRowIdx = 4;
            
            for (let w = 0; w < 6; w++) {
                if (currentDay > numDays) break;
                
                const dateRow = ws1.getRow(excelRowIdx);
                const studentRow = ws1.getRow(excelRowIdx + 1);
                dateRow.height = 18;
                studentRow.height = 70; // 4 lines height for stacked names
                
                for (let d = 0; d < 7; d++) {
                    const colLetter = String.fromCharCode(65 + d);
                    const cellDate = ws1.getCell(`${colLetter}${excelRowIdx}`);
                    const cellStudents = ws1.getCell(`${colLetter}${excelRowIdx + 1}`);
                    
                    const dayIdx = w * 7 + d;
                    if (dayIdx >= firstDay && currentDay <= numDays) {
                        cellDate.value = currentDay;
                        cellDate.font = { name: '맑은 고딕', size: 9, bold: true };
                        
                        if (d === 0) cellDate.font.color = { argb: 'FFFF0000' }; // Sunday
                        if (d === 6) cellDate.font.color = { argb: 'FF0284C7' }; // Saturday
                        
                        cellDate.alignment = { horizontal: 'left', vertical: 'middle' };
                        cellDate.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                        cellDate.border = {
                            top: { style: 'thin', color: { argb: gridBorderColor } },
                            left: { style: 'thin', color: { argb: gridBorderColor } },
                            right: { style: 'thin', color: { argb: gridBorderColor } }
                        };
                        
                        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
                        const daySchedules = getSchedulesForDate(dateStr);
                        
                        if (daySchedules.length > 0) {
                            const studentLines = daySchedules.map(s => {
                                const mealStr = s.hasMeal ? '(식)' : '';
                                return `${s.studentName}${mealStr} ${s.startHour}-${s.endHour}`;
                            });
                            cellStudents.value = studentLines.join('\n');
                            cellStudents.font = { name: '맑은 고딕', size: 8, color: { argb: 'FF1E293B' } };
                            cellStudents.alignment = { horizontal: 'center', vertical: 'top', wrapText: true };
                            cellStudents.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                            
                            // Check if exceptions modified this date
                            if (exceptions[dateStr] !== undefined) {
                                cellDate.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }; // Light Indigo
                                cellStudents.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBEFFF' } };
                            }
                        } else {
                            cellStudents.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                        }
                        
                        cellStudents.border = {
                            bottom: { style: 'thin', color: { argb: gridBorderColor } },
                            left: { style: 'thin', color: { argb: gridBorderColor } },
                            right: { style: 'thin', color: { argb: gridBorderColor } }
                        };
                        
                        currentDay++;
                    } else {
                        // Empty cells
                        cellDate.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                        cellDate.border = {
                            top: { style: 'thin', color: { argb: gridBorderColor } },
                            bottom: { style: 'thin', color: { argb: gridBorderColor } },
                            left: { style: 'thin', color: { argb: gridBorderColor } },
                            right: { style: 'thin', color: { argb: gridBorderColor } }
                        };
                        cellStudents.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                        cellStudents.border = {
                            top: { style: 'thin', color: { argb: gridBorderColor } },
                            bottom: { style: 'thin', color: { argb: gridBorderColor } },
                            left: { style: 'thin', color: { argb: gridBorderColor } },
                            right: { style: 'thin', color: { argb: gridBorderColor } }
                        };
                    }
                }
                excelRowIdx += 2;
            }

            // Outline double line at bottom of calendar
            ws1.getRow(excelRowIdx - 1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= 7) {
                    cell.border = {
                        ...cell.border,
                        bottom: { style: 'double', color: { argb: 'FF000000' } }
                    };
                }
            });

            // 4. Monthly Summary Tables: Columns I-J and L-M starting at Row 3
            ws1.mergeCells('I3:J3');
            const intHead = ws1.getCell('I3');
            intHead.value = '집중근로 월간 근무시간';
            intHead.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            intHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }; // Purple
            intHead.alignment = { horizontal: 'center', vertical: 'middle' };
            
            ws1.mergeCells('L3:M3');
            const natHead = ws1.getCell('L3');
            natHead.value = '학기중근로 월간 근무시간';
            natHead.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            natHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } }; // Sky
            natHead.alignment = { horizontal: 'center', vertical: 'middle' };

            ws1.getCell('I4').value = '이름';
            ws1.getCell('J4').value = '근무시간';
            ws1.getCell('L4').value = '이름';
            ws1.getCell('M4').value = '근무시간';
            
            const subHeaders = ['I4', 'J4', 'L4', 'M4'];
            subHeaders.forEach(cellRef => {
                const cell = ws1.getCell(cellRef);
                cell.font = { name: '맑은 고딕', size: 9, bold: true, color: { argb: 'FF475569' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FF475569' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });

            const intStudents = students.filter(s => s.type === '집중')
                .sort((a,b) => calculateMonthlyHours(b, selectedYear, selectedMonth) - calculateMonthlyHours(a, selectedYear, selectedMonth) || a.name.localeCompare(b.name));
            const natStudents = students.filter(s => s.type === '학기중')
                .sort((a,b) => calculateMonthlyHours(b, selectedYear, selectedMonth) - calculateMonthlyHours(a, selectedYear, selectedMonth) || a.name.localeCompare(b.name));

            const maxSummaryRows = Math.max(intStudents.length, natStudents.length);
            let intTotal = 0;
            let natTotal = 0;

            for (let i = 0; i < maxSummaryRows; i++) {
                const sumRowIdx = 5 + i;
                
                if (i < intStudents.length) {
                    const s = intStudents[i];
                    const hours = calculateMonthlyHours(s, selectedYear, selectedMonth);
                    intTotal += hours;
                    ws1.getCell(`I${sumRowIdx}`).value = s.name;
                    ws1.getCell(`J${sumRowIdx}`).value = hours;
                }
                
                if (i < natStudents.length) {
                    const s = natStudents[i];
                    const hours = calculateMonthlyHours(s, selectedYear, selectedMonth);
                    natTotal += hours;
                    ws1.getCell(`L${sumRowIdx}`).value = s.name;
                    ws1.getCell(`M${sumRowIdx}`).value = hours;
                }

                ['I', 'J', 'L', 'M'].forEach(col => {
                    const cell = ws1.getCell(`${col}${sumRowIdx}`);
                    cell.font = { name: '맑은 고딕', size: 9 };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                });
            }

            const totalRowIdx = 5 + maxSummaryRows;
            ws1.getCell(`I${totalRowIdx}`).value = '합계';
            ws1.getCell(`J${totalRowIdx}`).value = intTotal;
            ws1.getCell(`L${totalRowIdx}`).value = '합계';
            ws1.getCell(`M${totalRowIdx}`).value = natTotal;

            ['I', 'J', 'L', 'M'].forEach(col => {
                const cell = ws1.getCell(`${col}${totalRowIdx}`);
                cell.font = { name: '맑은 고딕', size: 9, bold: true, color: { argb: 'FF1E293B' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'medium', color: { argb: 'FF475569' } },
                    bottom: { style: 'double', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });
        }

        // ----------------------------------------------------
        // SHEET 2: 상세 데이터 테이블 목록 (원시 데이터)
        // ----------------------------------------------------
        const ws2 = workbook.addWorksheet('상세 일정 목록');
        ws2.views = [{ showGridLines: true }];

        ws2.columns = [
            { header: '날짜/구분', key: 'date', width: 14 },
            { header: '근로 구분', key: 'type', width: 12 },
            { header: '이름', key: 'name', width: 12 },
            { header: '시작시간', key: 'start', width: 10 },
            { header: '종료시간', key: 'end', width: 10 },
            { header: '식사감면(1h)', key: 'meal', width: 15 },
            { header: '실근무시간', key: 'actual', width: 15 }
        ];

        ws2.getRow(1).height = 25;
        ws2.getRow(1).eachCell(cell => {
            cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        if (currentView === 'weekly') {
            students.forEach(student => {
                if (student.isVariable) {
                    ws2.addRow({
                        date: '요일 고정',
                        type: `${student.type}근로`,
                        name: student.name,
                        start: '-',
                        end: '-',
                        meal: '-',
                        actual: '변동성'
                    });
                } else {
                    student.schedules.forEach(sched => {
                        sched.days.forEach(day => {
                            const actualHours = Math.max(0, sched.endHour - sched.startHour - (sched.hasMeal ? 1 : 0));
                            ws2.addRow({
                                date: `${day}요일`,
                                type: `${student.type}근로`,
                                name: student.name,
                                start: `${sched.startHour}:00`,
                                end: `${sched.endHour}:00`,
                                meal: sched.hasMeal ? '적용(1h 차감)' : '미적용',
                                actual: `${actualHours}시간`
                            });
                        });
                    });
                }
            });
        } else {
            const numDays = new Date(selectedYear, selectedMonth, 0).getDate();
            for (let d = 1; d <= numDays; d++) {
                const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayShifts = getSchedulesForDate(dateStr);
                
                dayShifts.forEach(shift => {
                    const actualHours = Math.max(0, shift.endHour - shift.startHour - (shift.hasMeal ? 1 : 0));
                    ws2.addRow({
                        date: dateStr,
                        type: `${shift.type}근로`,
                        name: shift.studentName,
                        start: `${shift.startHour}:00`,
                        end: `${shift.endHour}:00`,
                        meal: shift.hasMeal ? '적용(1h 차감)' : '미적용',
                        actual: `${actualHours}시간`
                    });
                });
            }
        }

        ws2.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.height = 20;
                row.eachCell(cell => {
                    cell.font = { name: '맑은 고딕', size: 9 };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                });
            }
        });

        // 6. Save Excel
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const fileName = currentView === 'weekly' 
            ? '학기중_집중근로장학생_시간표_주간.xlsx' 
            : `학기중_집중근로장학생_시간표_${selectedYear}년_${selectedMonth}월.xlsx`;
        saveAs(blob, fileName);

    } catch (error) {
        console.error('Error exporting Excel:', error);
        alert('엑셀 파일을 생성하는 중 오류가 발생했습니다. 개발자 도구의 로그를 확인해 주세요.');
    }
}

// Form Color Picker Initialization
function initFormColorPicker() {
    const container = document.getElementById('form-color-picker');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Auto color option
    const autoCircle = document.createElement('span');
    autoCircle.className = 'color-opt-circle auto-color selected';
    autoCircle.title = '자동 색상 지정';
    autoCircle.onclick = () => selectFormColor(-1);
    container.appendChild(autoCircle);

    studentColors.forEach((c, idx) => {
        const circle = document.createElement('span');
        circle.className = 'color-opt-circle';
        circle.style.backgroundColor = c.bg;
        circle.style.borderColor = c.border;
        circle.title = `색상 ${idx + 1}`;
        circle.onclick = () => selectFormColor(idx);
        container.appendChild(circle);
    });
}

function selectFormColor(idx) {
    document.getElementById('form-color-index').value = idx;
    const circles = document.querySelectorAll('#form-color-picker .color-opt-circle');
    
    circles.forEach((c, i) => {
        if (i === idx + 1) {
            c.classList.add('selected');
        } else {
            c.classList.remove('selected');
        }
    });
}

// Student List Inline Color Picker
function toggleColorDropdown(event, studentId) {
    event.stopPropagation();
    document.querySelectorAll('.color-dropdown-content').forEach(d => {
        if (d.id !== `color-dropdown-${studentId}`) {
            d.classList.remove('show');
        }
    });
    const dropdown = document.getElementById(`color-dropdown-${studentId}`);
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function changeStudentColor(studentId, colorIndex) {
    if (!isAdmin) return;
    const student = students.find(s => s.id === studentId);
    if (student) {
        student.colorIndex = colorIndex;
        saveData();
        updateUI();
    }
}

// Close color dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.color-dropdown-content').forEach(d => {
        d.classList.remove('show');
    });
});

function toggleStudentType(studentId) {
    if (!isAdmin) return;
    const student = students.find(s => s.id === studentId);
    if (student) {
        student.type = (student.type === '집중' ? '학기중' : '집중');
        saveData();
        updateUI();
    }
}

// Bind to window for inline HTML onclick handlers
window.toggleColorDropdown = toggleColorDropdown;
window.changeStudentColor = changeStudentColor;
window.toggleStudentType = toggleStudentType;
window.editStudent = editStudent;
window.deleteEditScheduleBlock = deleteEditScheduleBlock;

// ----------------------------------------------------
// STUDENT EDIT MODAL LOGIC
// ----------------------------------------------------
let editingStudentId = null;
let editingStudentSchedules = [];

function initStudentModalEvents() {
    const studentModal = document.getElementById('student-modal');
    const btnCloseStudentModal = document.getElementById('btn-close-student-modal');
    const btnCancelStudentModal = document.getElementById('btn-cancel-student-modal');
    const btnSaveStudentModal = document.getElementById('btn-save-student-modal');
    const btnAddEditScheduleBlock = document.getElementById('btn-add-edit-schedule-block');
    const editStudentVariable = document.getElementById('edit-student-variable');
    const editSchedulesSectionWrapper = document.getElementById('edit-schedules-section-wrapper');

    btnCloseStudentModal.addEventListener('click', closeStudentModal);
    btnCancelStudentModal.addEventListener('click', closeStudentModal);
    btnSaveStudentModal.addEventListener('click', saveStudentEdit);
    
    btnAddEditScheduleBlock.addEventListener('click', () => {
        // First sync current edits from the DOM to the array
        syncEditSchedulesFromDOM();
        editingStudentSchedules.push({
            days: [],
            startHour: 9,
            endHour: 18,
            hasMeal: false
        });
        renderEditSchedulesList();
    });

    editStudentVariable.addEventListener('change', (e) => {
        if (e.target.checked) {
            editSchedulesSectionWrapper.style.opacity = '0.4';
            editSchedulesSectionWrapper.style.pointerEvents = 'none';
        } else {
            editSchedulesSectionWrapper.style.opacity = '1';
            editSchedulesSectionWrapper.style.pointerEvents = 'auto';
        }
    });
}

function editStudent(studentId) {
    if (!isAdmin) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    editingStudentId = studentId;
    editingStudentSchedules = JSON.parse(JSON.stringify(student.schedules || []));

    document.getElementById('edit-student-name').value = student.name;
    document.getElementById('edit-student-type').value = student.type;
    
    const editStudentVariable = document.getElementById('edit-student-variable');
    editStudentVariable.checked = !!student.isVariable;
    
    const editSchedulesSectionWrapper = document.getElementById('edit-schedules-section-wrapper');
    if (editStudentVariable.checked) {
        editSchedulesSectionWrapper.style.opacity = '0.4';
        editSchedulesSectionWrapper.style.pointerEvents = 'none';
    } else {
        editSchedulesSectionWrapper.style.opacity = '1';
        editSchedulesSectionWrapper.style.pointerEvents = 'auto';
    }

    renderEditSchedulesList();

    document.getElementById('student-modal').classList.add('show');
}

function closeStudentModal() {
    document.getElementById('student-modal').classList.remove('show');
    editingStudentId = null;
    editingStudentSchedules = [];
}

function renderEditSchedulesList() {
    const listContainer = document.getElementById('edit-student-schedules-list');
    listContainer.innerHTML = '';

    if (editingStudentSchedules.length === 0) {
        listContainer.innerHTML = '<div class="no-data">등록된 고정 일정이 없습니다. 우측 상단의 "일정 추가" 버튼을 눌러 일정을 등록하세요.</div>';
        return;
    }

    editingStudentSchedules.forEach((sched, index) => {
        const item = document.createElement('div');
        item.className = 'edit-schedule-block-item';
        
        // Days markup
        const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
        const daysMarkup = weekdays.map(day => {
            const isChecked = sched.days.includes(day) ? 'checked' : '';
            const cbId = `edit-day-${index}-${day}`;
            return `
                <input type="checkbox" id="${cbId}" value="${day}" ${isChecked}>
                <label for="${cbId}">${day}</label>
            `;
        }).join('');

        item.innerHTML = `
            <div class="edit-schedule-block-header">
                <span>고정 일정 #${index + 1}</span>
                <button type="button" class="btn-delete-block" onclick="deleteEditScheduleBlock(${index})">삭제</button>
            </div>
            <div class="edit-days-checkboxes">
                ${daysMarkup}
            </div>
            <div class="form-row-3" style="margin-top: 0.25rem;">
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.75rem; margin-bottom:0.15rem;">시작 시간</label>
                    <input type="number" class="edit-block-start form-control" min="9" max="22" value="${sched.startHour}">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.75rem; margin-bottom:0.15rem;">종료 시간</label>
                    <input type="number" class="edit-block-end form-control" min="9" max="22" value="${sched.endHour}">
                </div>
                <div class="form-group meal-checkbox-group" style="padding-bottom: 0.15rem; margin-bottom:0;">
                    <label class="toggle-container" style="font-size:0.75rem;">
                        <input type="checkbox" class="edit-block-meal" ${sched.hasMeal ? 'checked' : ''}>
                        <span class="checkmark" style="height:14px; width:14px;"></span>
                        식사차감 (1h)
                    </label>
                </div>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

function deleteEditScheduleBlock(index) {
    // Read current state from DOM first so user doesn't lose other edits they just typed!
    syncEditSchedulesFromDOM();
    editingStudentSchedules.splice(index, 1);
    renderEditSchedulesList();
}

function syncEditSchedulesFromDOM() {
    const isVariable = document.getElementById('edit-student-variable').checked;
    if (isVariable) return;

    const blockElems = document.querySelectorAll('.edit-schedule-block-item');
    editingStudentSchedules = [];
    
    blockElems.forEach(elem => {
        const checkedDays = Array.from(elem.querySelectorAll('.edit-days-checkboxes input:checked')).map(cb => cb.value);
        const start = parseInt(elem.querySelector('.edit-block-start').value, 10) || 9;
        const end = parseInt(elem.querySelector('.edit-block-end').value, 10) || 18;
        const meal = elem.querySelector('.edit-block-meal').checked;
        
        editingStudentSchedules.push({
            days: checkedDays,
            startHour: start,
            endHour: end,
            hasMeal: meal
        });
    });
}

function saveStudentEdit() {
    const name = document.getElementById('edit-student-name').value.trim();
    if (!name) {
        alert('학생 이름을 입력하세요.');
        return;
    }
    
    const student = students.find(s => s.id === editingStudentId);
    if (!student) return;
    
    const type = document.getElementById('edit-student-type').value;
    const isVariable = document.getElementById('edit-student-variable').checked;
    
    const schedules = [];
    if (!isVariable) {
        const blockElems = document.querySelectorAll('.edit-schedule-block-item');
        for (let i = 0; i < blockElems.length; i++) {
            const elem = blockElems[i];
            const checkedDays = Array.from(elem.querySelectorAll('.edit-days-checkboxes input:checked')).map(cb => cb.value);
            if (checkedDays.length === 0) {
                alert(`고정 일정 #${i + 1}의 요일이 선택되지 않았습니다. 요일을 최소 1개 이상 선택하거나 일정을 삭제하세요.`);
                return;
            }
            
            const start = parseInt(elem.querySelector('.edit-block-start').value, 10);
            const end = parseInt(elem.querySelector('.edit-block-end').value, 10);
            const meal = elem.querySelector('.edit-block-meal').checked;
            
            if (start >= end) {
                alert(`고정 일정 #${i + 1}의 종료 시간이 시작 시간보다 커야 합니다.`);
                return;
            }
            
            schedules.push({
                days: checkedDays,
                startHour: start,
                endHour: end,
                hasMeal: meal
            });
        }
    }
    
    // Check if name is changed and conflicts with another student
    const duplicate = students.find(s => s.name === name && s.id !== editingStudentId);
    if (duplicate) {
        alert(`이미 '${name}' 이라는 이름을 가진 학생이 존재합니다. 다른 이름을 사용해 주세요.`);
        return;
    }
    
    // Update student
    student.name = name;
    student.type = type;
    student.isVariable = isVariable;
    student.schedules = schedules;
    
    saveData();
    closeStudentModal();
    updateUI();
}

function importLocalStorageToServer() {
    const savedStudents = localStorage.getItem('work_study_students');
    const savedExceptions = localStorage.getItem('work_study_exceptions');
    
    if (!savedStudents) {
        alert('이 브라우저에 저장되어 있는 이전 시간표 데이터가 없습니다.');
        return;
    }
    
    if (confirm('브라우저 캐시에 남아있는 이전 데이터를 가져와 현재 폴더의 data.json 파일에 저장하시겠습니까? (현재 데이터는 덮어쓰여 대체됩니다.)')) {
        try {
            students = JSON.parse(savedStudents);
            exceptions = savedExceptions ? JSON.parse(savedExceptions) : {};
            
            // This will write directly to data.json on the server!
            saveData();
            updateUI();
            alert('성공적으로 이전 데이터를 가져와 폴더 내 data.json 파일에 동기화 완료했습니다!');
        } catch (e) {
            console.error('Failed to import local storage', e);
            alert('데이터 변환 중 오류가 발생했습니다.');
        }
    }
}

// HTML-to-Image Export (html2canvas integration)
function exportToImage() {
    let originalElement = null;

    if (currentView === 'weekly') {
        originalElement = document.querySelector('.timetable-panel');
    } else {
        originalElement = document.getElementById('calendar-panel');
    }

    if (!originalElement) return;

    const btnExportImage = document.getElementById('btn-export-image');
    const originalText = btnExportImage.innerHTML;
    btnExportImage.innerHTML = '⌛ A4 이미지 변환 중...';
    btnExportImage.disabled = true;

    const options = {
        backgroundColor: '#ffffff', // Clean white background for print
        scale: 2, // High resolution for clear prints
        useCORS: true,
        logging: false
    };

    // Helper to apply print-style light mode theme to the cloned element
    function applyLightModeTheme(clone, filterType) {
        clone.style.backgroundColor = '#ffffff';
        clone.style.color = '#0f172a';
        clone.style.borderColor = '#cbd5e1';
        clone.style.boxShadow = 'none';

        const panelHeader = clone.querySelector('.panel-header');
        if (panelHeader) {
            panelHeader.style.borderBottom = '2px solid #e2e8f0';
            panelHeader.style.paddingBottom = '0.5rem';
            const h2 = panelHeader.querySelector('h2');
            if (h2) h2.style.color = '#0f172a';
        }

        // Hide edit/batch buttons in the header so they don't print
        const headerButtons = clone.querySelectorAll('.calendar-header-actions button');
        headerButtons.forEach(btn => btn.style.display = 'none');

        const calInfo = clone.querySelector('.calendar-info');
        if (calInfo) {
            calInfo.style.color = '#475569';
            if (filterType) {
                calInfo.innerHTML = `<strong>${filterType}근로 장학생</strong>의 월간 근무 일정표입니다.`;
            }
        }

        const legend = clone.querySelector('.calendar-legend');
        if (legend) {
            legend.style.color = '#334155';
            const legendItems = legend.querySelectorAll('.legend-item');
            legendItems.forEach(item => {
                const text = item.textContent.trim();
                if (filterType === '집중' && text.includes('학기중')) {
                    item.style.display = 'none';
                } else if (filterType === '학기중' && text.includes('집중')) {
                    item.style.display = 'none';
                }
            });
        }

        const calTitle = clone.querySelector('#calendar-title-label');
        if (calTitle && filterType) {
            calTitle.textContent = `${selectedYear}년 ${selectedMonth}월 (${filterType}근로)`;
        }

        const calendarDays = clone.querySelector('.calendar-days');
        if (calendarDays) {
            calendarDays.style.backgroundColor = '#cbd5e1';
            calendarDays.style.borderLeftColor = '#cbd5e1';
            calendarDays.style.borderBottomColor = '#cbd5e1';
        }

        const weekdays = clone.querySelectorAll('.weekday');
        weekdays.forEach(w => {
            w.style.backgroundColor = '#f8fafc';
            w.style.color = '#334155';
            w.style.borderRightColor = '#cbd5e1';
            if (w.classList.contains('Sunday')) {
                w.style.color = '#dc2626';
            } else if (w.classList.contains('Saturday')) {
                w.style.color = '#0284c7';
            }
        });

        const cells = clone.querySelectorAll('.calendar-day-cell');
        cells.forEach(cell => {
            cell.style.backgroundColor = '#ffffff';
            cell.style.borderRightColor = '#cbd5e1';
            cell.style.borderTopColor = '#cbd5e1';
            if (cell.classList.contains('empty')) {
                cell.style.backgroundColor = '#f8fafc';
            }
            cell.classList.remove('has-exceptions');
            cell.style.boxShadow = 'none';
        });

        const dayNumbers = clone.querySelectorAll('.day-number');
        dayNumbers.forEach(num => {
            num.style.color = '#0f172a';
            const pencil = num.querySelector('span');
            if (pencil) pencil.remove();
        });

        // Filter pills for monthly view
        if (filterType) {
            const pills = clone.querySelectorAll('.calendar-student-pill');
            pills.forEach(pill => {
                if (pill.dataset.type !== filterType) {
                    pill.remove();
                } else {
                    pill.style.boxShadow = 'none';
                    // Slightly darken text for better contrast on white background
                    pill.style.textShadow = 'none';
                    pill.style.border = '1px solid rgba(0, 0, 0, 0.15)';
                }
            });
        }

        // For weekly view
        const dayCards = clone.querySelectorAll('.day-card');
        dayCards.forEach(card => {
            card.style.backgroundColor = '#ffffff';
            card.style.borderColor = '#cbd5e1';
            
            const cardHeader = card.querySelector('.day-card-header');
            if (cardHeader) {
                cardHeader.style.backgroundColor = '#f8fafc';
                cardHeader.style.color = '#0f172a';
                cardHeader.style.borderBottom = '1px solid #cbd5e1';
            }

            const gridBgRows = card.querySelectorAll('.grid-bg-row');
            gridBgRows.forEach(row => {
                row.style.borderBottomColor = '#e2e8f0';
            });

            const gridContentAreas = card.querySelectorAll('.grid-content-area');
            gridContentAreas.forEach(area => {
                area.style.backgroundColor = '#ffffff';
            });

            const timeLabels = card.querySelectorAll('.time-slot-label');
            timeLabels.forEach(label => {
                label.style.color = '#475569';
                label.style.borderRight = '1px solid #cbd5e1';
            });

            const schedBlocks = card.querySelectorAll('.schedule-block');
            schedBlocks.forEach(block => {
                block.style.boxShadow = 'none';
                block.style.textShadow = 'none';
                block.style.border = '1px solid rgba(0,0,0,0.15)';
            });
        });
    }

    if (currentView === 'weekly') {
        // Render 1 Weekly TimeTable in Light Mode
        const exportContainer = document.createElement('div');
        exportContainer.style.position = 'fixed';
        exportContainer.style.top = '-9999px';
        exportContainer.style.left = '-9999px';
        exportContainer.style.width = '1414px';
        exportContainer.style.height = 'auto';
        exportContainer.style.boxSizing = 'border-box';
        exportContainer.style.backgroundColor = '#ffffff';
        exportContainer.style.padding = '2rem';

        const clone = originalElement.cloneNode(true);
        clone.style.width = '100%';
        clone.style.height = 'auto';
        clone.style.margin = '0';
        clone.style.boxSizing = 'border-box';
        
        applyLightModeTheme(clone, null);
        exportContainer.appendChild(clone);
        document.body.appendChild(exportContainer);

        const naturalHeight = exportContainer.offsetHeight;
        const targetRatio = 1.414;
        const currentRatio = 1414 / naturalHeight;

        if (currentRatio > targetRatio) {
            const targetHeight = Math.round(1414 / targetRatio);
            const paddingNeeded = targetHeight - naturalHeight;
            if (paddingNeeded > 0) exportContainer.style.paddingBottom = `calc(2rem + ${paddingNeeded}px)`;
        } else if (currentRatio < targetRatio) {
            const targetWidth = Math.round(naturalHeight * targetRatio);
            exportContainer.style.width = `${targetWidth}px`;
        }

        html2canvas(exportContainer, options)
        .then(canvas => {
            canvas.toBlob(blob => {
                saveAs(blob, '학기중_집중근로장학생_시간표_주간_A4.png');
                document.body.removeChild(exportContainer);
                btnExportImage.innerHTML = originalText;
                btnExportImage.disabled = false;
            });
        })
        .catch(err => {
            console.error('Weekly image export failed:', err);
            alert('이미지 저장 중 오류가 발생했습니다.');
            if (document.body.contains(exportContainer)) document.body.removeChild(exportContainer);
            btnExportImage.innerHTML = originalText;
            btnExportImage.disabled = false;
        });
    } else {
        // Render 2 Monthly Calendars sequentially (Semester then Intensive)
        function renderMonthlyType(type, nextCallback) {
            const fileName = `${type}근로_시간표_${selectedYear}년_${selectedMonth}월_A4.png`;
            
            const exportContainer = document.createElement('div');
            exportContainer.style.position = 'fixed';
            exportContainer.style.top = '-9999px';
            exportContainer.style.left = '-9999px';
            exportContainer.style.width = '1414px';
            exportContainer.style.height = 'auto';
            exportContainer.style.boxSizing = 'border-box';
            exportContainer.style.backgroundColor = '#ffffff';
            exportContainer.style.padding = '2rem';

            const clone = originalElement.cloneNode(true);
            clone.style.width = '100%';
            clone.style.height = 'auto';
            clone.style.margin = '0';
            clone.style.boxSizing = 'border-box';
            
            applyLightModeTheme(clone, type);
            exportContainer.appendChild(clone);
            document.body.appendChild(exportContainer);

            const naturalHeight = exportContainer.offsetHeight;
            const targetRatio = 1.414;
            const currentRatio = 1414 / naturalHeight;

            if (currentRatio > targetRatio) {
                const targetHeight = Math.round(1414 / targetRatio);
                const paddingNeeded = targetHeight - naturalHeight;
                if (paddingNeeded > 0) exportContainer.style.paddingBottom = `calc(2rem + ${paddingNeeded}px)`;
            } else if (currentRatio < targetRatio) {
                const targetWidth = Math.round(naturalHeight * targetRatio);
                exportContainer.style.width = `${targetWidth}px`;
            }

            html2canvas(exportContainer, options)
            .then(canvas => {
                canvas.toBlob(blob => {
                    saveAs(blob, fileName);
                    document.body.removeChild(exportContainer);
                    if (nextCallback) nextCallback();
                });
            })
            .catch(err => {
                console.error(`Monthly image export failed for ${type}:`, err);
                if (document.body.contains(exportContainer)) document.body.removeChild(exportContainer);
                if (nextCallback) nextCallback();
            });
        }

        renderMonthlyType('학기중', () => {
            renderMonthlyType('집중', () => {
                btnExportImage.innerHTML = originalText;
                btnExportImage.disabled = false;
                alert('학기중근로 및 집중근로 2장의 고대비 흰색 인쇄용 시간표가 성공적으로 다운로드되었습니다!');
            });
        });
    }
}

function triggerExcelImport() {
    document.getElementById('excel-file-input').click();
}

async function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const btn = document.getElementById('btn-import-excel-file');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⌛ 복구 중...';
    btn.disabled = true;

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(arrayBuffer);

                // Find sheet
                let ws = workbook.getWorksheet('상세 일정 목록');
                if (!ws) {
                    ws = workbook.getWorksheet('데이터 목록');
                }
                
                if (!ws) {
                    alert('올바른 시간표 엑셀 파일이 아닙니다. "상세 일정 목록" 시트가 포함되어 있어야 합니다.');
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    return;
                }

                const importedStudents = [];
                const importedExceptions = {};

                // Loop rows (row 1 is header)
                ws.eachRow((row, rowNumber) => {
                    if (rowNumber === 1) return; // Skip header

                    const dateVal = row.getCell(1).value; // 날짜/구분
                    const typeVal = row.getCell(2).value; // 근로 구분
                    const nameVal = row.getCell(3).value; // 이름
                    const startVal = row.getCell(4).value; // 시작시간
                    const endVal = row.getCell(5).value; // 종료시간
                    const mealVal = row.getCell(6).value; // 식사감면(1h)
                    const actualVal = row.getCell(7).value; // 실근무시간

                    if (!nameVal) return;

                    const type = typeVal ? typeVal.toString().replace('근로', '').trim() : '학기중';
                    const isVar = (actualVal === '변동성' || startVal === '-' || startVal === null);

                    // Find or create student
                    let student = importedStudents.find(s => s.name === nameVal);
                    if (!student) {
                        student = {
                            id: 's_' + Math.random().toString(36).substr(2, 9),
                            name: nameVal,
                            type: type,
                            schedules: [],
                            isVariable: isVar
                        };
                        importedStudents.push(student);
                    }

                    if (isVar) {
                        student.isVariable = true;
                        return;
                    }

                    // Parse times (e.g. "9:00" -> 9)
                    const startHour = startVal ? parseInt(startVal.toString().split(':')[0], 10) : 9;
                    const endHour = endVal ? parseInt(endVal.toString().split(':')[0], 10) : 18;
                    const hasMeal = mealVal ? mealVal.toString().includes('적용') : false;

                    // Check if date specific (YYYY-MM-DD) or weekly weekday (월요일)
                    const dateStr = dateVal ? dateVal.toString().trim() : '';
                    
                    if (dateStr.endsWith('요일')) {
                        const dayChar = dateStr.charAt(0); // '월', '화'
                        
                        let existingSched = student.schedules.find(s => s.startHour === startHour && s.endHour === endHour && s.hasMeal === hasMeal);
                        if (existingSched) {
                            if (!existingSched.days.includes(dayChar)) {
                                existingSched.days.push(dayChar);
                            }
                        } else {
                            student.schedules.push({
                                days: [dayChar],
                                startHour: startHour,
                                endHour: endHour,
                                hasMeal: hasMeal
                            });
                        }
                    } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        // Date-specific exception
                        if (!importedExceptions[dateStr]) {
                            importedExceptions[dateStr] = [];
                        }
                        // Check duplicate in exception list
                        const dup = importedExceptions[dateStr].some(s => s.studentName === nameVal && s.startHour === startHour && s.endHour === endHour);
                        if (!dup) {
                            importedExceptions[dateStr].push({
                                studentName: nameVal,
                                type: type,
                                startHour: startHour,
                                endHour: endHour,
                                hasMeal: hasMeal
                            });
                        }
                    }
                });

                if (importedStudents.length === 0) {
                    alert('엑셀 파일에서 유효한 학생 데이터를 찾을 수 없습니다.');
                } else {
                    if (confirm(`엑셀 파일로부터 ${importedStudents.length}명의 학생 목록과 스케줄을 추출했습니다. 현재 데이터를 모두 지우고 이 데이터로 복구하시겠습니까?`)) {
                        students = importedStudents;
                        exceptions = importedExceptions;
                        saveData();
                        updateUI();
                        alert('성공적으로 시간표 데이터가 복구되었습니다!');
                    }
                }
            } catch (err) {
                console.error(err);
                alert('엑셀 파일을 읽는 중 오류가 발생했습니다.');
            }
            btn.innerHTML = originalText;
            btn.disabled = false;
        };
        reader.readAsArrayBuffer(file);
    } catch (e) {
        console.error(e);
        alert('파일을 여는 중 오류가 발생했습니다.');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

window.triggerExcelImport = triggerExcelImport;
window.handleExcelImport = handleExcelImport;

// Monthly Batch Actions
function applyWeeklySchedulesToMonth() {
    if (!isAdmin) return;
    if (students.length === 0) {
        alert('등록된 학생 및 고정 시간표가 없습니다. 먼저 주간 고정 시간표를 등록해 주세요.');
        return;
    }
    
    if (confirm(`${selectedYear}년 ${selectedMonth}월 전체 날짜에 주간 고정 시간표를 일괄 적용하시겠습니까? (기존의 모든 월간 변경 및 추가 일정은 초기화됩니다.)`)) {
        const numDays = new Date(selectedYear, selectedMonth, 0).getDate();
        
        for (let d = 1; d <= numDays; d++) {
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(selectedYear, selectedMonth - 1, d);
            const weekdayChar = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
            
            const daySchedules = [];
            students.forEach(student => {
                if (student.isVariable) return;
                student.schedules.forEach(sched => {
                    if (sched.days.includes(weekdayChar)) {
                        daySchedules.push({
                            studentName: student.name,
                            type: student.type,
                            startHour: sched.startHour,
                            endHour: sched.endHour,
                            hasMeal: sched.hasMeal
                        });
                    }
                });
            });
            
            exceptions[dateStr] = daySchedules;
        }
        
        saveData();
        updateUI();
        alert(`${selectedYear}년 ${selectedMonth}월에 주간 고정 시간표가 성공적으로 일괄 생성되었습니다!`);
    }
}

function clearMonthlySchedules() {
    if (!isAdmin) return;
    if (confirm(`${selectedYear}년 ${selectedMonth}월의 모든 근무 일정을 지우고 빈 달력으로 만드시겠습니까?`)) {
        const numDays = new Date(selectedYear, selectedMonth, 0).getDate();
        
        for (let d = 1; d <= numDays; d++) {
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            exceptions[dateStr] = []; // Empty array means no shifts on this date
        }
        
        saveData();
        updateUI();
        alert(`${selectedYear}년 ${selectedMonth}월 일정이 모두 초기화되었습니다.`);
    }
}

// --- ADMIN SECURITY & AUTHORIZATION MODULE ---

// Update UI elements visibility based on Admin vs Guest permission
function applyAuthorizationUI() {
    const body = document.body;
    const adminElements = document.querySelectorAll('.admin-only');

    if (isAdmin) {
        body.classList.remove('guest-mode');
        adminElements.forEach(el => {
            el.style.display = ''; // Restore default CSS display properties (block, grid, flex, etc.)
        });
        if (btnAdminLogin) btnAdminLogin.style.display = 'none';
        if (btnAdminLogout) btnAdminLogout.style.display = 'inline-flex';
    } else {
        body.classList.add('guest-mode');
        adminElements.forEach(el => {
            el.style.display = 'none'; // Explicitly hide in guest mode
        });
        if (btnAdminLogin) btnAdminLogin.style.display = 'inline-flex';
        if (btnAdminLogout) btnAdminLogout.style.display = 'none';
    }
}

// Open admin login modal
function openLoginModal() {
    if (loginUsername) loginUsername.value = '';
    if (loginPassword) loginPassword.value = '';
    if (loginModal) loginModal.classList.add('show');
    setTimeout(() => {
        if (loginUsername) loginUsername.focus();
    }, 150);
}

// Close admin login modal
function closeLoginModal() {
    if (loginModal) loginModal.classList.remove('show');
}

// Handle login submit
async function handleLogin() {
    if (!loginUsername || !loginPassword) return;
    const username = loginUsername.value.trim();
    const pwd = loginPassword.value.trim();
    
    if (!username) {
        alert('아이디를 입력하세요.');
        loginUsername.focus();
        return;
    }
    if (username !== '근장관리자') {
        alert('존재하지 않는 아이디이거나 관리자 계정이 아닙니다.');
        loginUsername.select();
        return;
    }
    if (!pwd) {
        alert('비밀번호를 입력하세요.');
        loginPassword.focus();
        return;
    }

    // SHA-256 Hash of entered password
    const enteredHash = CryptoJS.SHA256(pwd).toString(CryptoJS.enc.Hex);
    const correctHash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // SHA-256 for '1234'
    const legacyHash = 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f'; // Legacy hash typo

    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('timetable_store')
                .select('master_password_hash')
                .eq('id', 1)
                .single();

            if (error) {
                console.error('Failed to verify password from DB:', error);
                alert('클라우드 DB 검증에 실패했습니다. 로컬 패스워드 검증으로 시도합니다.');
                verifyLocalPassword(pwd, enteredHash);
                return;
            }

            const dbHash = data ? data.master_password_hash : '';
            if (dbHash === enteredHash || (dbHash === legacyHash && enteredHash === correctHash)) {
                // Self-heal: If DB has the wrong legacy hash, silently update it to the correct hash
                if (dbHash === legacyHash) {
                    supabaseClient
                        .from('timetable_store')
                        .update({ master_password_hash: correctHash })
                        .eq('id', 1)
                        .then(() => console.log('Successfully self-healed DB password hash.'));
                }
                executeLoginSuccess();
            } else {
                alert('비밀번호가 올바르지 않습니다.');
                loginPassword.select();
            }
        } catch (e) {
            console.error('Login validation error:', e);
            verifyLocalPassword(pwd, enteredHash);
        }
    } else {
        verifyLocalPassword(pwd, enteredHash);
    }
}

// Verify password locally (fallback if Supabase not configured)
function verifyLocalPassword(pwd, enteredHash) {
    const defaultHash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // '1234'
    const legacyHash = 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f';
    if (enteredHash === defaultHash || enteredHash === legacyHash) {
        executeLoginSuccess();
    } else {
        alert('비밀번호가 올바르지 않습니다.');
        if (loginPassword) loginPassword.select();
    }
}

// Login success handler
function executeLoginSuccess() {
    isAdmin = true;
    sessionStorage.setItem('work_study_admin_logged_in', 'true');
    applyAuthorizationUI();
    closeLoginModal();
    updateUI(); // Refresh UI to render admin buttons and table actions
    alert('🔐 관리자 권한이 인증되었습니다. 편집 기능이 활성화됩니다!');
}

// Logout handler
function handleLogout() {
    if (confirm('로그아웃 하시겠습니까? 조회 전용(일반) 모드로 즉시 전환됩니다.')) {
        isAdmin = false;
        sessionStorage.removeItem('work_study_admin_logged_in');
        applyAuthorizationUI();
        updateUI(); // Hide edit buttons and actions
        alert('조회 전용 모드로 전환되었습니다.');
    }
}

// Open change password modal
function openPasswordModal() {
    if (newPassword) newPassword.value = '';
    if (newPasswordConfirm) newPasswordConfirm.value = '';
    if (passwordModal) passwordModal.classList.add('show');
    setTimeout(() => {
        if (newPassword) newPassword.focus();
    }, 150);
}

// Close change password modal
function closePasswordModal() {
    if (passwordModal) passwordModal.classList.remove('show');
}

// Handle password change submit
async function handlePasswordChange() {
    if (!newPassword || !newPasswordConfirm) return;
    const pwd = newPassword.value.trim();
    const pwdConfirm = newPasswordConfirm.value.trim();

    if (!pwd) {
        alert('새 비밀번호를 입력해 주세요.');
        return;
    }
    if (pwd.length < 4) {
        alert('비밀번호는 최소 4자리 이상이어야 합니다.');
        return;
    }
    if (pwd !== pwdConfirm) {
        alert('새 비밀번호와 비밀번호 확인 입력값이 다릅니다.');
        newPasswordConfirm.select();
        return;
    }

    const newHash = CryptoJS.SHA256(pwd).toString(CryptoJS.enc.Hex);

    if (supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('timetable_store')
                .update({ master_password_hash: newHash })
                .eq('id', 1);

            if (error) throw error;
            alert('🔒 마스터 비밀번호가 클라우드 DB에 안전하게 변경 적용되었습니다!');
            closePasswordModal();
        } catch (e) {
            console.error('Password change failed on Supabase:', e);
            alert('비밀번호 변경사항을 DB에 저장하지 못했습니다. DB 권한 및 연결 설정을 확인해 주세요.');
        }
    } else {
        alert('현재 로컬 모드입니다. 비밀번호 변경은 app.js에 Supabase 접속 정보를 등록한 후에 클라우드 저장방식으로 작동합니다.');
        closePasswordModal();
    }
}

// Bind auth modal and button events
function initAuthEvents() {
    if (btnAdminLogin) btnAdminLogin.addEventListener('click', openLoginModal);
    if (btnAdminLogout) btnAdminLogout.addEventListener('click', handleLogout);
    if (btnCloseLoginModal) btnCloseLoginModal.addEventListener('click', closeLoginModal);
    if (btnLoginCancel) btnLoginCancel.addEventListener('click', closeLoginModal);
    if (btnLoginSubmit) btnLoginSubmit.addEventListener('click', handleLogin);

    if (loginUsername) {
        loginUsername.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (loginPassword) loginPassword.focus();
            }
        });
    }

    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    if (btnChangePassword) btnChangePassword.addEventListener('click', openPasswordModal);
    if (btnClosePasswordModal) btnClosePasswordModal.addEventListener('click', closePasswordModal);
    if (btnPasswordCancel) btnPasswordCancel.addEventListener('click', closePasswordModal);
    if (btnPasswordSubmit) btnPasswordSubmit.addEventListener('click', handlePasswordChange);

    if (newPasswordConfirm) {
        newPasswordConfirm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handlePasswordChange();
        });
    }
}

// ----------------------------------------------------
// CURRENT WORKERS LOGIC
// ----------------------------------------------------
function initCurrentWorkersEvents() {
    const btnShowCurrentWorkers = document.getElementById('btn-show-current-workers');
    const currentWorkersModal = document.getElementById('current-workers-modal');
    const btnCloseCurrentWorkersModal = document.getElementById('btn-close-current-workers-modal');
    const btnCloseCurrentWorkersModalFooter = document.getElementById('btn-close-current-workers-modal-footer');
    const btnRefreshCurrentWorkers = document.getElementById('btn-refresh-current-workers');

    if (btnShowCurrentWorkers) {
        btnShowCurrentWorkers.addEventListener('click', showCurrentWorkers);
    }
    
    const closeFn = () => {
        if (currentWorkersModal) currentWorkersModal.classList.remove('show');
    };

    if (btnCloseCurrentWorkersModal) btnCloseCurrentWorkersModal.addEventListener('click', closeFn);
    if (btnCloseCurrentWorkersModalFooter) btnCloseCurrentWorkersModalFooter.addEventListener('click', closeFn);
    
    if (btnRefreshCurrentWorkers) {
        btnRefreshCurrentWorkers.addEventListener('click', showCurrentWorkers);
    }
}

function showCurrentWorkers() {
    const currentWorkersModal = document.getElementById('current-workers-modal');
    const currentWorkersTime = document.getElementById('current-workers-time');
    const currentWorkersList = document.getElementById('current-workers-list');

    if (!currentWorkersModal || !currentWorkersTime || !currentWorkersList) return;

    // Get current local system time
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const dateStr = `${year}-${month}-${day}`;
    currentWorkersTime.textContent = `${year}-${month}-${day} ${hours}:${minutes}`;

    // Get shifts for today
    const todayShifts = getSchedulesForDate(dateStr);
    const currentHour = now.getHours();

    // Filter shifts currently in progress
    const activeShifts = todayShifts.filter(shift => {
        return shift.startHour <= currentHour && currentHour < shift.endHour;
    });

    currentWorkersList.innerHTML = '';

    if (activeShifts.length === 0) {
        currentWorkersList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary); font-size: 0.9rem;">
                현재 근무 중인 장학생이 없습니다.
            </div>
        `;
    } else {
        activeShifts.forEach(shift => {
            // Find student color index
            const student = students.find(s => s.name === shift.studentName);
            const colorIdx = student ? student.colorIndex : 1;
            
            const item = document.createElement('div');
            item.className = 'worker-item';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.padding = '0.75rem 1rem';
            item.style.backgroundColor = '#1e293b';
            item.style.borderRadius = '0.5rem';
            item.style.border = '1px solid var(--border-color)';

            const left = document.createElement('div');
            left.style.display = 'flex';
            left.style.alignItems = 'center';
            left.style.gap = '0.75rem';

            const dot = document.createElement('span');
            dot.className = 'legend-dot';
            dot.style.backgroundColor = `var(--student-color-${colorIdx})`;
            dot.style.width = '12px';
            dot.style.height = '12px';
            dot.style.borderRadius = '50%';
            dot.style.display = 'inline-block';

            const name = document.createElement('span');
            name.style.fontWeight = '700';
            name.style.color = 'var(--text-primary)';
            name.textContent = shift.studentName;

            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.style.fontSize = '0.7rem';
            badge.style.padding = '0.1rem 0.35rem';
            badge.style.backgroundColor = shift.type === '집중' ? '#7c3aed' : '#0284c7';
            badge.textContent = `${shift.type}근로`;

            left.appendChild(dot);
            left.appendChild(name);
            left.appendChild(badge);

            const right = document.createElement('div');
            right.style.fontSize = '0.85rem';
            right.style.color = 'var(--text-secondary)';
            right.style.fontWeight = '500';
            
            const startStr = String(shift.startHour).padStart(2, '0') + ':00';
            const endStr = String(shift.endHour).padStart(2, '0') + ':00';
            right.textContent = `${startStr} ~ ${endStr}` + (shift.hasMeal ? ' (식사차감)' : '');

            item.appendChild(left);
            item.appendChild(right);
            currentWorkersList.appendChild(item);
        });
    }

    currentWorkersModal.classList.add('show');
}



