import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Target } from 'lucide-react';

export function SkillsRadar({ sessions = [] }) {
  const radarData = useMemo(() => {
    const criteriaStats = {};
    
    sessions.forEach(session => {
      if (!session.criteria) return;
      session.criteria.forEach(crit => {
        // Ignorar criterios no calificados
        if (crit.score === null) return;
        
        // Simplificar nombres muy largos para el gráfico
        let name = crit.name;
        if (name.toLowerCase().includes('asistencia')) name = 'Asistencia';
        if (name.toLowerCase().includes('conducta')) name = 'Conducta';
        if (name.toLowerCase().includes('participa')) name = 'Participación';
        if (name.toLowerCase().includes('tarea') || name.toLowerCase().includes('trabajo')) name = 'Tareas';

        if (!criteriaStats[name]) {
          criteriaStats[name] = { score: 0, max: 0 };
        }
        criteriaStats[name].score += crit.score;
        criteriaStats[name].max += crit.max_score;
      });
    });

    const data = Object.keys(criteriaStats).map(name => {
      const stat = criteriaStats[name];
      return {
        subject: name,
        A: stat.max > 0 ? Math.round((stat.score / stat.max) * 100) : 0,
        fullMark: 100
      };
    });

    // Si hay menos de 3 atributos, agregamos "dummy" para que el polígono tenga forma
    if (data.length > 0 && data.length < 3) {
       data.push({ subject: 'Creatividad', A: 0, fullMark: 100 });
       if (data.length < 3) {
         data.push({ subject: 'Lógica', A: 0, fullMark: 100 });
       }
    }

    return data;
  }, [sessions]);

  if (radarData.length === 0) {
    return (
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl shadow-slate-900/5 flex flex-col items-center justify-center text-center h-64">
        <Target className="w-12 h-12 text-slate-200 mb-2" />
        <p className="text-slate-400 font-medium">Aún no hay suficientes calificaciones para generar tu perfil de habilidades.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl shadow-slate-900/5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-indigo-500" />
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Perfil de Habilidades</h3>
      </div>
      <div className="w-full h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis 
               dataKey="subject" 
               tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip 
              formatter={(value) => [`${value}%`, 'Efectividad']}
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Radar
              name="Estudiante"
              dataKey="A"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
