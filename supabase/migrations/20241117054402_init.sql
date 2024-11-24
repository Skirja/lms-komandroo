create table tracks (
  id bigint primary key generated always as identity,
  name text not null
);

create table admins (
  id bigint primary key generated always as identity,
  name text not null,
  email text unique not null,
  password text not null
);

create table students (
  id bigint primary key generated always as identity,
  name text not null,
  email text unique not null,
  password text not null,
  track_id bigint references tracks (id)
);

create table users (
  id uuid primary key,
  email text unique not null,
  password text not null,
  role text not null check (role in ('admin', 'student')),
  student_id bigint references students (id),
  admin_id bigint references admins (id)
);

create table learning_resources (
  id bigint primary key generated always as identity,
  title text not null,
  content text not null,
  track_id bigint references tracks (id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table quizzes (
  id bigint primary key generated always as identity,
  title text not null,
  track_id bigint references tracks (id),
  time_limit integer,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table quiz_questions (
  id bigint primary key generated always as identity,
  quiz_id bigint references quizzes (id),
  question_text text not null,
  question_type text not null check (
    question_type in ('multiple_choice', 'single_choice')
  )
);

create table quiz_options (
  id bigint primary key generated always as identity,
  question_id bigint references quiz_questions (id),
  option_text text not null,
  is_correct boolean not null
);

create table student_quiz_attempts (
  id bigint primary key generated always as identity,
  student_id bigint references students (id),
  quiz_id bigint references quizzes (id),
  score int,
  attempt_number int not null,
  created_at timestamp with time zone default now()
);

create table quiz_results (
  id bigint primary key generated always as identity,
  quiz_id bigint references quizzes (id),
  student_id bigint references students (id),
  start_time timestamp with time zone default now(),
  end_time timestamp with time zone,
  score integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table quiz_answers (
  id bigint primary key generated always as identity,
  quiz_result_id bigint references quiz_results (id),
  question_id bigint references quiz_questions (id),
  selected_option_id bigint references quiz_options (id),
  created_at timestamp with time zone default now(),
  unique(quiz_result_id, question_id)
);

create table projects (
  id bigint primary key generated always as identity,
  title text not null,
  description text not null,
  track_id bigint references tracks (id),
  deadline timestamp with time zone not null
);

create table student_projects (
  id bigint primary key generated always as identity,
  student_id bigint references students (id),
  project_id bigint references projects (id),
  file_path text not null,
  submitted_at timestamp with time zone default now()
);