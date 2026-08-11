import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { GraduationCap, Mail, Lock, ArrowRight, Loader2, UserPlus, Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "../providers/ThemeProvider";
import { useToast } from "../providers/ToastProvider";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast("Error: " + error.message, "error");
    else navigate("/home");
    setLoading(false);
  };

  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] rounded-full animate-pulse opacity-40" 
            style={{ background: 'radial-gradient(circle, hsl(262 83% 60% / 0.4), transparent 70%)' }} />
          <div className="absolute bottom-[20%] right-[20%] w-[300px] h-[300px] rounded-full opacity-30 animate-pulse" 
            style={{ background: 'radial-gradient(circle, hsl(185 85% 60% / 0.4), transparent 70%)', animationDelay: '1s' }} />
          <div className="absolute top-[50%] left-[50%] w-[500px] h-[500px] rounded-full opacity-20" 
            style={{ background: 'radial-gradient(circle, hsl(270 70% 65% / 0.3), transparent 70%)', transform: 'translate(-50%, -50%)' }} />
        </div>
      </div>

      {/* Theme Toggle - Glass Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-50 p-3.5 rounded-2xl transition-all hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, hsl(0 0% 100% / 0.15), hsl(0 0% 100% / 0.05))',
          backdropFilter: 'blur(20px)',
          border: '1px solid hsl(0 0% 100% / 0.1)',
          boxShadow: '0 8px 32px rgb(0 0 0 / 0.1)'
        }}
      >
        {isDark ? <Sun className="w-5 h-5" style={{ color: 'hsl(25 95% 60%)' }} /> : <Moon className="w-5 h-5" style={{ color: 'hsl(262 60% 50%)' }} />}
      </button>

      <div className="w-full max-w-md relative">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="relative inline-block mb-6 mt-10">
            {/* Glow */}
            <div className="absolute inset-0 rounded-[3rem] blur-2xl opacity-60" style={{ background: 'linear-gradient(135deg, hsl(262 83% 60%), hsl(185 85% 60%))' }} />
            
            {/* Logo - Glass Circle */}
            <div className="relative p-8 rounded-[3rem] transition-all hover:scale-105 duration-300"
              style={{
                background: 'linear-gradient(135deg, hsl(262 83% 60% / 0.8), hsl(270 70% 55% / 0.9))',
                backdropFilter: 'blur(20px)',
                border: '1px solid hsl(0 0% 100% / 0.2)',
                boxShadow: '0 8px 40px hsl(262 83% 60% / 0.4)'
              }}>
              <GraduationCap className="w-14 h-14 text-white" />
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-white/80 animate-pulse" />
            </div>
          </div>
          
          <h1 className="text-5xl font-['Outfit'] font-extrabold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, hsl(262 70% 55%), hsl(185 85% 60%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px hsl(262 83% 60% / 0.3))'
            }}>
            Notyx
          </h1>
          
          <p className="font-['DM_Sans'] font-medium text-sm mt-4 tracking-[0.15em] uppercase" style={{ color: 'hsl(var(--color-text-secondary))' }}>
            Level Up Your Learning
          </p>
        </div>

        {/* Login Card - Glassmorphism */}
        <Card className="card-elevated" style={{ background: isDark 
          ? 'linear-gradient(145deg, hsl(220 20% 12% / 0.6), hsl(220 20% 8% / 0.3))' 
          : 'linear-gradient(145deg, hsl(0 0% 100% / 0.6), hsl(0 0% 100% / 0.3))' }}>
          {/* Gradient top bar */}
          <div className="h-1.5 w-full" style={{
            background: 'linear-gradient(90deg, hsl(262 83% 60%), hsl(185 85% 60%), hsl(270 70% 65%), hsl(262 83% 60%))',
            backgroundSize: '200% 100%',
            animation: 'gradient-shift 3s ease infinite'
          }} />
          
          <CardHeader className="text-center pt-12 pb-4 px-8">
            <CardTitle className="text-2xl font-['Outfit'] font-bold" style={{ color: 'hsl(var(--color-text-primary))' }}>
              Welcome Back
            </CardTitle>
            <CardDescription className="font-['DM_Sans'] mt-2" style={{ color: 'hsl(var(--color-text-secondary))' }}>
              Sign in to continue your journey
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-2.5">
                  <label className="label">Email</label>
                  <div className="input-wrapper">
                    <Mail className="input-icon" />
                    <input type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className="input" />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="label">Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" />
                    <input type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)}
                      className="input" />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="btn-primary w-full h-12 rounded-xl font-['DM_Sans'] font-bold text-base gap-2.5">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Sign In</span> <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </form>

            <div className="mt-8 pt-6 flex flex-col items-center gap-4" style={{ borderTop: '1px solid hsl(0 0% 0% / 0.05)' }}>
              <p className="text-sm font-['DM_Sans']" style={{ color: 'hsl(var(--color-text-secondary))' }}>Don't have an account?</p>
              <Link to="/register" className="w-full">
                <Button variant="secondary" className="w-full h-11 rounded-xl font-['DM_Sans'] font-bold gap-2">
                  <UserPlus className="w-4 h-4" /> Create Teacher Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs font-['DM_Sans'] leading-relaxed px-4" style={{ color: 'hsl(var(--color-text-muted))' }}>
          For educational institutions only.<br />Students can join via links shared by their teachers.
        </p>
      </div>

      <style>{`
        @keyframes gradient-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
      `}</style>
    </div>
  );
}