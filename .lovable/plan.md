## מה נבנה

ארבעה שדרוגים מרכזיים, מסודרים לפי ערך מהיר → עומק:

### 1. טיוטות אוטומטיות בעורך הפריסות (Auto-save)
- כל שינוי בעורך נשמר אוטומטית ל-`localStorage` (debounce 800ms) תחת מפתח לפי `layoutId` או `"new"`.
- בפתיחת העורך: אם קיימת טיוטה חדשה יותר מהגרסה השמורה בענן → באנר "יש לך טיוטה שלא נשמרה — שחזר / התעלם".
- מחוון קטן בסרגל העליון: "נשמרה טיוטה · לפני 3 שניות" / "שמור לענן".
- ניקוי הטיוטה אחרי שמירה מוצלחת לענן.

### 2. סידור וארגון פריסות
בתפריט המתג (הפאנל הצף) יתווספו:
- **חיפוש** לפי שם.
- **גרירה לסידור** — react-rnd כבר מותקן; נשתמש ב-drag ידני פשוט (HTML5 DnD) על הרשימה, עם עמודה חדשה `sort_order` בטבלה.
- **תיקיות/תגיות** — שדה `folder` טקסטואלי אופציונלי (למשל "פגישות", "הדרכות"). קיבוץ ויזואלי לפי תיקייה עם קיפול/פתיחה.
- **שכפול פריסה** (כפתור ליד ערוך/מחק).
- **ייצוא/ייבוא JSON** — כפתור בסרגל העורך: הורדת `.json` והעלאתו חזרה.

### 3. צ'אט חי בסטודיו
- לוח צף בצד ימין (ניתן לפתיחה/סגירה), נטען בכל הפריסות המובנות ובעורך.
- טבלה חדשה `chat_messages` בענן עם Realtime מופעל.
- מודל פשוט: הודעה טקסטואלית, שם שולח (מהפרופיל / "אורח"), חותמת זמן, `room_id` (כרגע יחיד — `"main"`).
- אווטר צבעוני מהאותיות הראשונות, הבדל ברור בין הודעות שלי (מיושרות ימין, זהב) לאחרות (שמאל, שקוף).
- אינדיקטור "מקליד..." אופציונלי (עדכון פשוט דרך Realtime broadcast).
- כפתור צף מציג ספירת הודעות שלא נקראו.

### 4. שיתוף וחיבור
- **קישור שיתוף לפריסה** — כפתור "שתף" בעורך ובתפריט → מייצר URL עם ה-`spec` מקודד (base64) בפרמטר, למשל `/?share=...`. פותח את הפריסה בקריאה בלבד גם למי שלא מחובר.
- כפתור "שמור לספרייה שלי" למי שרואה פריסה משותפת (מחייב התחברות).
- **הזמנה לחדר צ'אט** — כפתור בפאנל הצ'אט "העתק קישור" (URL של הסטודיו). לעתיד אפשר להרחיב לחדרים מרובים.

## פרטים טכניים

**סכמת DB (מיגרציות חדשות):**
```sql
-- custom_layouts: הוספת שדות סידור/תיקייה
ALTER TABLE public.custom_layouts
  ADD COLUMN folder text,
  ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- chat_messages
CREATE TABLE public.chat_messages (
  id uuid PK default gen_random_uuid(),
  room_id text NOT NULL default 'main',
  user_id uuid,          -- nullable = guest
  display_name text NOT NULL,
  body text NOT NULL check (char_length(body) between 1 and 2000),
  created_at timestamptz NOT NULL default now()
);
GRANT SELECT ON public.chat_messages TO anon, authenticated;
GRANT INSERT ON public.chat_messages TO authenticated;  -- guests read-only for now
GRANT ALL ON public.chat_messages TO service_role;
-- RLS: קריאה פתוחה לחדר "main", כתיבה רק למחוברים כשה-user_id תואם
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
```

**קבצים חדשים / עריכות:**
- `src/components/studio/ChatPanel.tsx` — פאנל צ'אט עם Realtime.
- `src/components/studio/useAutosave.ts` — הוק ל-localStorage debounce.
- `src/components/studio/layoutShareCodec.ts` — encode/decode `spec` ל-URL.
- `src/components/studio/LayoutEditor.tsx` — אינטגרציית auto-save, באנר טיוטה, כפתורי שיתוף/ייצוא/ייבוא.
- `src/routes/index.tsx` — הצגת ChatPanel גלובלית, טעינת פריסה משותפת מ-URL, שדרוג ה-LayoutSwitcher (חיפוש, גרירה, תיקיות, שכפול).

## תוכנית ביצוע (סדר)
1. מיגרציות DB (custom_layouts + chat_messages + Realtime).
2. Auto-save בעורך + באנר שחזור טיוטה.
3. שדרוג ה-LayoutSwitcher (חיפוש, שכפול, תיקיות, גרירה, ייצוא/ייבוא).
4. שיתוף URL של פריסה (encode/decode + מסך "שמור לספרייה").
5. ChatPanel גלובלי עם Realtime.

## מורכבות
בינונית-גבוהה, ~5-7 קבצים חדשים/מעודכנים + 2 מיגרציות. אין תלויות npm חדשות.

## המלצה שלי לסדר עדיפויות
אם רוצה להתחיל מהמשמעותי-והבטוח ביותר: **1 → 2 → 4 → 3**. הצ'אט החי אחרון כי הוא זה שגורר את השאלות (חדרים? התחברות אורחים? מודרציה?). מסכים?
