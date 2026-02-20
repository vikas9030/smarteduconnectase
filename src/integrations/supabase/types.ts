export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          target_audience: string[] | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_audience?: string[] | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_audience?: string[] | null
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string | null
          date: string
          id: string
          marked_by: string | null
          reason: string | null
          session: string | null
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          marked_by?: string | null
          reason?: string | null
          session?: string | null
          status: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          marked_by?: string | null
          reason?: string | null
          session?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_requests: {
        Row: {
          approved_by: string | null
          attachment_url: string | null
          certificate_type: string
          created_at: string | null
          id: string
          requested_by: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          approved_by?: string | null
          attachment_url?: string | null
          certificate_type: string
          created_at?: string | null
          id?: string
          requested_by?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          approved_by?: string | null
          attachment_url?: string | null
          certificate_type?: string
          created_at?: string | null
          id?: string
          requested_by?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_type: string | null
          academic_year: string
          class_teacher_id: string | null
          created_at: string | null
          id: string
          name: string
          section: string
        }
        Insert: {
          academic_type?: string | null
          academic_year?: string
          class_teacher_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          section: string
        }
        Update: {
          academic_type?: string | null
          academic_year?: string
          class_teacher_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          section?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          created_at: string | null
          description: string
          id: string
          response: string | null
          status: string | null
          subject: string
          submitted_by: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          response?: string | null
          status?: string | null
          subject: string
          submitted_by: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          response?: string | null
          status?: string | null
          subject?: string
          submitted_by?: string
        }
        Relationships: []
      }
      exam_cycles: {
        Row: {
          created_at: string | null
          created_by: string | null
          cycle_number: number
          end_date: string
          exam_type: string
          id: string
          is_active: boolean | null
          start_date: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          cycle_number?: number
          end_date: string
          exam_type: string
          id?: string
          is_active?: boolean | null
          start_date: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          cycle_number?: number
          end_date?: string
          exam_type?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
        }
        Relationships: []
      }
      exam_marks: {
        Row: {
          created_at: string | null
          exam_id: string
          grade: string | null
          id: string
          marks_obtained: number | null
          remarks: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          exam_id: string
          grade?: string | null
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          exam_id?: string
          grade?: string | null
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_marks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          class_id: string | null
          created_at: string | null
          exam_date: string | null
          exam_time: string | null
          id: string
          max_marks: number | null
          name: string
          subject_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          exam_date?: string | null
          exam_time?: string | null
          id?: string
          max_marks?: number | null
          name: string
          subject_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          exam_date?: string | null
          exam_time?: string | null
          id?: string
          max_marks?: number | null
          name?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          fee_type: string
          id: string
          paid_amount: number | null
          paid_at: string | null
          payment_status: string | null
          receipt_number: string | null
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          fee_type: string
          id?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_status?: string | null
          receipt_number?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          fee_type?: string
          id?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_status?: string | null
          receipt_number?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_folders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          folder_id: string
          id: string
          image_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          folder_id: string
          id?: string
          image_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          folder_id?: string
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "gallery_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          attachment_url: string | null
          class_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          subject_id: string | null
          title: string
        }
        Insert: {
          attachment_url?: string | null
          class_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          subject_id?: string | null
          title: string
        }
        Update: {
          attachment_url?: string | null
          class_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          subject_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_call_logs: {
        Row: {
          call_outcome: string | null
          called_by: string
          created_at: string | null
          id: string
          lead_id: string
          notes: string | null
        }
        Insert: {
          call_outcome?: string | null
          called_by: string
          created_at?: string | null
          id?: string
          lead_id: string
          notes?: string | null
        }
        Update: {
          call_outcome?: string | null
          called_by?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_status_history: {
        Row: {
          changed_by: string
          created_at: string | null
          id: string
          lead_id: string
          new_status: string
          old_status: string | null
          remarks: string | null
        }
        Insert: {
          changed_by: string
          created_at?: string | null
          id?: string
          lead_id: string
          new_status: string
          old_status?: string | null
          remarks?: string | null
        }
        Update: {
          changed_by?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          new_status?: string
          old_status?: string | null
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          academic_performance: string | null
          academic_year: string | null
          address: string | null
          alternate_mobile: string | null
          annual_income_range: string | null
          area_city: string | null
          assigned_teacher_id: string | null
          class_applying_for: string | null
          created_at: string | null
          created_by: string
          current_class: string | null
          date_of_birth: string | null
          education_board: string | null
          email: string | null
          father_education: string | null
          father_name: string | null
          father_occupation: string | null
          gender: string | null
          id: string
          last_class_passed: string | null
          medium_of_instruction: string | null
          mother_education: string | null
          mother_name: string | null
          mother_occupation: string | null
          next_followup_date: string | null
          previous_school: string | null
          primary_contact_person: string | null
          primary_mobile: string
          remarks: string | null
          status: string
          student_name: string
          updated_at: string | null
        }
        Insert: {
          academic_performance?: string | null
          academic_year?: string | null
          address?: string | null
          alternate_mobile?: string | null
          annual_income_range?: string | null
          area_city?: string | null
          assigned_teacher_id?: string | null
          class_applying_for?: string | null
          created_at?: string | null
          created_by: string
          current_class?: string | null
          date_of_birth?: string | null
          education_board?: string | null
          email?: string | null
          father_education?: string | null
          father_name?: string | null
          father_occupation?: string | null
          gender?: string | null
          id?: string
          last_class_passed?: string | null
          medium_of_instruction?: string | null
          mother_education?: string | null
          mother_name?: string | null
          mother_occupation?: string | null
          next_followup_date?: string | null
          previous_school?: string | null
          primary_contact_person?: string | null
          primary_mobile: string
          remarks?: string | null
          status?: string
          student_name: string
          updated_at?: string | null
        }
        Update: {
          academic_performance?: string | null
          academic_year?: string | null
          address?: string | null
          alternate_mobile?: string | null
          annual_income_range?: string | null
          area_city?: string | null
          assigned_teacher_id?: string | null
          class_applying_for?: string | null
          created_at?: string | null
          created_by?: string
          current_class?: string | null
          date_of_birth?: string | null
          education_board?: string | null
          email?: string | null
          father_education?: string | null
          father_name?: string | null
          father_occupation?: string | null
          gender?: string | null
          id?: string
          last_class_passed?: string | null
          medium_of_instruction?: string | null
          mother_education?: string | null
          mother_name?: string | null
          mother_occupation?: string | null
          next_followup_date?: string | null
          previous_school?: string | null
          primary_contact_person?: string | null
          primary_mobile?: string
          remarks?: string | null
          status?: string
          student_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_teacher_id_fkey"
            columns: ["assigned_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          attachment_url: string | null
          created_at: string | null
          from_date: string
          id: string
          reason: string
          request_type: string
          status: string | null
          student_id: string | null
          teacher_id: string | null
          to_date: string
        }
        Insert: {
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string | null
          from_date: string
          id?: string
          reason: string
          request_type: string
          status?: string | null
          student_id?: string | null
          teacher_id?: string | null
          to_date: string
        }
        Update: {
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string | null
          from_date?: string
          id?: string
          reason?: string
          request_type?: string
          status?: string | null
          student_id?: string | null
          teacher_id?: string | null
          to_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
          student_id: string | null
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
          student_id?: string | null
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parents: {
        Row: {
          created_at: string | null
          id: string
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          photo_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      question_papers: {
        Row: {
          class_id: string
          created_at: string | null
          exam_id: string
          id: string
          total_marks: number
          total_questions: number
          uploaded_by: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          exam_id: string
          id?: string
          total_marks?: number
          total_questions?: number
          uploaded_by?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          exam_id?: string
          id?: string
          total_marks?: number
          total_questions?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_papers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_papers_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "weekly_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer: string | null
          created_at: string | null
          explanation: string | null
          id: string
          marks: number
          option_a: string | null
          option_b: string | null
          option_c: string | null
          option_d: string | null
          question_number: number
          question_paper_id: string
          question_text: string
          question_type: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          marks?: number
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          question_number?: number
          question_paper_id: string
          question_text: string
          question_type?: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          marks?: number
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          question_number?: number
          question_paper_id?: string
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_question_paper_id_fkey"
            columns: ["question_paper_id"]
            isOneToOne: false
            referencedRelation: "question_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_audit_log: {
        Row: {
          changed_by: string
          created_at: string | null
          id: string
          new_value: string | null
          old_value: string | null
          setting_key: string
        }
        Insert: {
          changed_by: string
          created_at?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          setting_key: string
        }
        Update: {
          changed_by?: string
          created_at?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          setting_key?: string
        }
        Relationships: []
      }
      student_exam_answers: {
        Row: {
          answered_at: string | null
          exam_id: string
          id: string
          is_correct: boolean | null
          marks_awarded: number | null
          question_id: string
          selected_answer: string | null
          student_id: string
        }
        Insert: {
          answered_at?: string | null
          exam_id: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id: string
          selected_answer?: string | null
          student_id: string
        }
        Update: {
          answered_at?: string | null
          exam_id?: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id?: string
          selected_answer?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_exam_answers_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "weekly_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_answers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_exam_results: {
        Row: {
          created_at: string | null
          exam_id: string
          id: string
          obtained_marks: number
          percentage: number | null
          rank: number | null
          student_id: string
          submitted_at: string | null
          total_marks: number
        }
        Insert: {
          created_at?: string | null
          exam_id: string
          id?: string
          obtained_marks?: number
          percentage?: number | null
          rank?: number | null
          student_id: string
          submitted_at?: string | null
          total_marks?: number
        }
        Update: {
          created_at?: string | null
          exam_id?: string
          id?: string
          obtained_marks?: number
          percentage?: number | null
          rank?: number | null
          student_id?: string
          submitted_at?: string | null
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "weekly_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parents: {
        Row: {
          id: string
          parent_id: string
          relationship: string | null
          student_id: string
        }
        Insert: {
          id?: string
          parent_id: string
          relationship?: string | null
          student_id: string
        }
        Update: {
          id?: string
          parent_id?: string
          relationship?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_reports: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          parent_visible: boolean | null
          severity: string | null
          student_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          parent_visible?: boolean | null
          severity?: string | null
          student_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          parent_visible?: boolean | null
          severity?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_number: string
          blood_group: string | null
          class_id: string | null
          created_at: string | null
          date_of_birth: string | null
          emergency_contact: string | null
          emergency_contact_name: string | null
          full_name: string
          id: string
          login_id: string | null
          parent_name: string | null
          parent_phone: string | null
          password_hash: string | null
          photo_url: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          admission_number: string
          blood_group?: string | null
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: string | null
          emergency_contact_name?: string | null
          full_name: string
          id?: string
          login_id?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          password_hash?: string | null
          photo_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          admission_number?: string
          blood_group?: string | null
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: string | null
          emergency_contact_name?: string | null
          full_name?: string
          id?: string
          login_id?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          password_hash?: string | null
          photo_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          category: string | null
          code: string | null
          created_at: string | null
          exam_type: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          code?: string | null
          created_at?: string | null
          exam_type?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          code?: string | null
          created_at?: string | null
          exam_type?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      syllabus: {
        Row: {
          chapter_name: string
          class_id: string
          created_at: string | null
          created_by: string | null
          cycle_id: string | null
          end_date: string | null
          exam_type: string | null
          id: string
          schedule_date: string | null
          schedule_time: string | null
          start_date: string | null
          subject_id: string
          syllabus_type: string
          topic_name: string
          week_number: number | null
        }
        Insert: {
          chapter_name: string
          class_id: string
          created_at?: string | null
          created_by?: string | null
          cycle_id?: string | null
          end_date?: string | null
          exam_type?: string | null
          id?: string
          schedule_date?: string | null
          schedule_time?: string | null
          start_date?: string | null
          subject_id: string
          syllabus_type?: string
          topic_name: string
          week_number?: number | null
        }
        Update: {
          chapter_name?: string
          class_id?: string
          created_at?: string | null
          created_by?: string | null
          cycle_id?: string | null
          end_date?: string | null
          exam_type?: string | null
          id?: string
          schedule_date?: string | null
          schedule_time?: string | null
          start_date?: string | null
          subject_id?: string
          syllabus_type?: string
          topic_name?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "exam_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabus_schedule: {
        Row: {
          class_id: string
          created_at: string | null
          date: string
          end_time: string
          id: string
          start_time: string
          syllabus_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          start_time: string
          syllabus_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          start_time?: string
          syllabus_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_schedule_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_schedule_syllabus_id_fkey"
            columns: ["syllabus_id"]
            isOneToOne: false
            referencedRelation: "syllabus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_schedule_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_classes: {
        Row: {
          class_id: string
          id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          id?: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_lead_permissions: {
        Row: {
          created_at: string | null
          enabled: boolean
          id: string
          teacher_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          teacher_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          teacher_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_lead_permissions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_syllabus_map: {
        Row: {
          created_at: string | null
          id: string
          role_type: string
          syllabus_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_type?: string
          syllabus_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role_type?: string
          syllabus_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_syllabus_map_syllabus_id_fkey"
            columns: ["syllabus_id"]
            isOneToOne: false
            referencedRelation: "syllabus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_syllabus_map_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string | null
          id: string
          joining_date: string | null
          qualification: string | null
          status: string | null
          subjects: string[] | null
          teacher_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          joining_date?: string | null
          qualification?: string | null
          status?: string | null
          subjects?: string[] | null
          teacher_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          joining_date?: string | null
          qualification?: string | null
          status?: string | null
          subjects?: string[] | null
          teacher_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      timetable: {
        Row: {
          class_id: string
          created_at: string | null
          day_of_week: string
          end_time: string
          id: string
          is_published: boolean | null
          period_number: number
          start_time: string
          subject_id: string | null
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          day_of_week: string
          end_time: string
          id?: string
          is_published?: boolean | null
          period_number: number
          start_time: string
          subject_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          day_of_week?: string
          end_time?: string
          id?: string
          is_published?: boolean | null
          period_number?: number
          start_time?: string
          subject_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_exam_syllabus: {
        Row: {
          created_at: string | null
          exam_id: string
          id: string
          syllabus_id: string
        }
        Insert: {
          created_at?: string | null
          exam_id: string
          id?: string
          syllabus_id: string
        }
        Update: {
          created_at?: string | null
          exam_id?: string
          id?: string
          syllabus_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_exam_syllabus_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "weekly_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_exam_syllabus_syllabus_id_fkey"
            columns: ["syllabus_id"]
            isOneToOne: false
            referencedRelation: "syllabus"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_exams: {
        Row: {
          class_id: string
          created_at: string | null
          created_by: string | null
          cycle_id: string | null
          duration_minutes: number
          exam_date: string
          exam_time: string
          exam_title: string
          id: string
          negative_marking: boolean | null
          negative_marks_value: number | null
          reminder_enabled: boolean | null
          status: string
          syllabus_type: string
          total_marks: number
          week_number: number | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          created_by?: string | null
          cycle_id?: string | null
          duration_minutes?: number
          exam_date: string
          exam_time: string
          exam_title: string
          id?: string
          negative_marking?: boolean | null
          negative_marks_value?: number | null
          reminder_enabled?: boolean | null
          status?: string
          syllabus_type?: string
          total_marks?: number
          week_number?: number | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          created_by?: string | null
          cycle_id?: string | null
          duration_minutes?: number
          exam_date?: string
          exam_time?: string
          exam_title?: string
          id?: string
          negative_marking?: boolean | null
          negative_marks_value?: number | null
          reminder_enabled?: boolean | null
          status?: string
          syllabus_type?: string
          total_marks?: number
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_exams_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "exam_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      get_admin_user_ids: { Args: never; Returns: string[] }
      get_parent_login_email: {
        Args: { student_identifier: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "parent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "parent"],
    },
  },
} as const
