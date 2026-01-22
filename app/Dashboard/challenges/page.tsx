"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  IconTrophy,
  IconFlame,
  IconMedal,
  IconStar,
  IconLeaf,
  IconBolt,
  IconBike,
  IconSalad,
  IconCheck,
  IconLock,
  IconLoader2,
  IconPlus
} from "@tabler/icons-react"
import { api } from "@/lib/api"

interface Challenge {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  targetReduction: number
  duration: number
  points: number
  icon: string | null
  userProgress?: {
    status: string
    progress: number
    carbonSaved: number
    startDate: string
    endDate: string
  } | null
}

interface UserChallengeStats {
  active: number
  completed: number
  totalCarbonSaved: number
  totalPoints: number
}

const getChallengeIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case "transport": return IconBike
    case "energy": return IconBolt
    case "food": return IconSalad
    default: return IconLeaf
  }
}

export default function ChallengesPage() {
  const [loading, setLoading] = useState(true)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [stats, setStats] = useState<UserChallengeStats>({
    active: 0,
    completed: 0,
    totalCarbonSaved: 0,
    totalPoints: 0
  })
  const [joining, setJoining] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Get all challenges with user progress
      const { data: challengesData } = await api.getChallenges(true)
      if (challengesData?.challenges) {
        setChallenges(challengesData.challenges)
      }

      // Get user's challenge stats
      const { data: myData } = await api.getMyChallenges()
      if (myData?.stats) {
        setStats(myData.stats)
      }
    } catch (error) {
      console.error("Failed to fetch challenges:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinChallenge(challengeId: string) {
    setJoining(challengeId)
    try {
      const { error } = await api.joinChallenge(challengeId)
      if (!error) {
        // Refresh data
        fetchData()
      }
    } catch (error) {
      console.error("Failed to join challenge:", error)
    } finally {
      setJoining(null)
    }
  }

  const activeChallenges = challenges.filter(c => c.userProgress?.status === "active")
  const availableChallenges = challenges.filter(c => !c.userProgress)

  const badges = [
    { name: "Seedling", icon: "🌱", unlocked: stats.completed >= 1, description: "Complete 1 challenge" },
    { name: "Green Warrior", icon: "🌿", unlocked: stats.totalCarbonSaved >= 50, description: "50 kg CO2 saved" },
    { name: "Eco Champion", icon: "🌳", unlocked: stats.totalCarbonSaved >= 100, description: "100 kg CO2 saved" },
    { name: "Challenge Master", icon: "🏆", unlocked: stats.completed >= 5, description: "Complete 5 challenges" },
    { name: "Carbon Warrior", icon: "🥗", unlocked: stats.totalCarbonSaved >= 200, description: "200 kg CO2 saved" },
    { name: "Eco Legend", icon: "⚡", unlocked: stats.completed >= 10, description: "Complete 10 challenges" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  // Empty state when no challenges exist
  if (challenges.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Challenges & Rewards</h1>
          <p className="text-muted-foreground">Complete challenges to earn points and badges</p>
        </div>

        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardContent className="py-12 text-center">
            <IconTrophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Challenges Available</h3>
            <p className="text-muted-foreground mb-4">
              Challenges haven&apos;t been set up yet. Run the database seed to add challenges.
            </p>
            <code className="text-sm bg-muted px-3 py-1 rounded">npm run db:seed</code>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Challenges & Rewards</h1>
        <p className="text-muted-foreground">Complete challenges to earn points and badges</p>
      </div>

      {/* Points Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="py-4 flex items-center gap-4">
            <IconStar className="h-10 w-10 text-yellow-500" />
            <div>
              <div className="text-sm text-muted-foreground">Green Points</div>
              <div className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardContent className="py-4 flex items-center gap-4">
            <IconMedal className="h-10 w-10 text-orange-500" />
            <div>
              <div className="text-sm text-muted-foreground">Badges Earned</div>
              <div className="text-2xl font-bold">{badges.filter(b => b.unlocked).length}/6</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardContent className="py-4 flex items-center gap-4">
            <IconLeaf className="h-10 w-10 text-green-500" />
            <div>
              <div className="text-sm text-muted-foreground">CO2 Saved</div>
              <div className="text-2xl font-bold">{stats.totalCarbonSaved.toFixed(1)} kg</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Challenges */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconTrophy className="h-5 w-5 text-yellow-500" />
            Active Challenges ({activeChallenges.length})
          </CardTitle>
          <CardDescription>Complete these to earn rewards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeChallenges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <IconTrophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active challenges.</p>
              <p className="text-sm">Join a challenge below to get started!</p>
            </div>
          ) : (
            activeChallenges.map((challenge) => {
              const Icon = getChallengeIcon(challenge.category)
              const endDate = challenge.userProgress?.endDate ? new Date(challenge.userProgress.endDate) : null
              const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0

              return (
                <div key={challenge.id} className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Icon className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{challenge.title}</h3>
                          <p className="text-sm text-muted-foreground">{challenge.description}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {daysLeft} days left
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{challenge.userProgress?.progress || 0}%</span>
                        </div>
                        <Progress value={challenge.userProgress?.progress || 0} className="h-2" indicatorClassName="bg-green-500" />
                      </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-green-500">
                          <IconLeaf className="h-3 w-3 inline mr-1" />
                          {challenge.userProgress?.carbonSaved?.toFixed(1) || 0} kg CO2 saved
                        </span>
                        <span className="text-muted-foreground">{challenge.points} points</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Available Challenges */}
      {availableChallenges.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconPlus className="h-5 w-5 text-green-500" />
              Available Challenges
            </CardTitle>
            <CardDescription>Join new challenges to reduce your carbon footprint</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableChallenges.map((challenge) => {
              const Icon = getChallengeIcon(challenge.category)

              return (
                <div key={challenge.id} className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Icon className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{challenge.title}</h3>
                          <p className="text-sm text-muted-foreground">{challenge.description}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500 capitalize">
                          {challenge.difficulty}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{challenge.duration} days</span>
                          <span>{challenge.points} points</span>
                          <span className="text-green-500">
                            <IconLeaf className="h-3 w-3 inline mr-1" />
                            Save {challenge.targetReduction} kg CO2
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleJoinChallenge(challenge.id)}
                          disabled={joining === challenge.id}
                        >
                          {joining === challenge.id ? (
                            <IconLoader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Join"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconMedal className="h-5 w-5 text-orange-500" />
            Your Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {badges.map((badge, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg text-center ${
                  badge.unlocked
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-muted/30 opacity-50'
                }`}
              >
                <div className="text-3xl mb-2">
                  {badge.unlocked ? badge.icon : <IconLock className="h-8 w-8 mx-auto text-muted-foreground" />}
                </div>
                <div className="font-medium text-sm">{badge.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{badge.description}</div>
                {badge.unlocked && (
                  <IconCheck className="h-4 w-4 text-green-500 mx-auto mt-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Completed Challenges Summary */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconTrophy className="h-5 w-5 text-yellow-500" />
            Your Progress
          </CardTitle>
          <CardDescription>Keep up the great work!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <div className="text-3xl font-bold text-green-500">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Challenges Completed</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <div className="text-3xl font-bold text-green-500">{stats.active}</div>
              <div className="text-sm text-muted-foreground">Active Challenges</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
