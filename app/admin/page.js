'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Users, BookOpen, GraduationCap } from "lucide-react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

export default function AdminPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTracks: 0,
    totalResources: 0,
    totalActivities: 0
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [trackStats, setTrackStats] = useState([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch total students
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })

        // Fetch total learning resources
        const { count: resourceCount } = await supabase
          .from('learning_resources')
          .select('*', { count: 'exact', head: true })

        // Fetch total tracks
        const { count: trackCount } = await supabase
          .from('tracks')
          .select('*', { count: 'exact', head: true })

        // Fetch total activities from quiz_results
        const { count: activityCount } = await supabase
          .from('quiz_results')
          .select('*', { count: 'exact', head: true })

        setStats({
          totalStudents: studentCount || 0,
          totalTracks: trackCount || 0,
          totalResources: resourceCount || 0,
          totalActivities: activityCount || 0
        })

        // Fetch recent quiz activities
        const { data: quizResults, error: quizError } = await supabase
          .from('quiz_results')
          .select(`
            *,
            quizzes (
              title
            ),
            students (
              name,
              email
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5)

        if (quizError) {
          console.error('Error fetching quiz results:', quizError)
        } else {
          // Format activities
          const formattedActivities = quizResults?.map(result => ({
            id: result.id,
            studentName: result.students?.name,
            studentEmail: result.students?.email,
            quizTitle: result.quizzes?.title,
            score: result.score,
            created_at: result.created_at,
            completed: result.end_time !== null
          })) || []
          
          setRecentActivities(formattedActivities)
        }

        // Fetch all track statistics
        const { data: tracks, error: trackError } = await supabase
          .from('tracks')
          .select(`
            name,
            students (count)
          `)
          .order('name', { ascending: true })

        if (trackError) {
          console.error('Error fetching tracks:', trackError)
        } else {
          const trackStatsData = tracks?.map(track => ({
            name: track.name,
            studentCount: track.students?.[0]?.count || 0
          })) || []

          setTrackStats(trackStatsData)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      }
    }

    fetchDashboardData()
  }, [supabase])

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Registered Students
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Tracks</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTracks}</div>
            <p className="text-xs text-muted-foreground">
              Learning Paths
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalResources}</div>
            <p className="text-xs text-muted-foreground">
              Learning Resources
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActivities}</div>
            <p className="text-xs text-muted-foreground">
              Quiz Results
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.studentName || activity.studentEmail || 'Unknown User'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.completed ? 'Completed' : 'Working on'} Quiz: {activity.quizTitle}
                      {activity.completed && activity.score !== null && ` (Score: ${activity.score})`}
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    {new Date(activity.created_at).toLocaleDateString('en-US')}
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <p className="text-sm text-muted-foreground">No quiz activities yet</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Track Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trackStats.map((track) => (
                <div key={track.name} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{track.name}</p>
                    <p className="text-sm text-muted-foreground">{track.studentCount} students</p>
                  </div>
                </div>
              ))}
              {trackStats.length === 0 && (
                <p className="text-sm text-muted-foreground">No track data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
