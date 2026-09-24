import CaseStudyDownload from "./CaseStudyDownload";
import AppImage from "@/components/ui/AppImage";

interface CaseStudyCardProps {
  title: string;
  client: string;
  category: string;
  roi: string;
  technicalDetails: string;
  image?: string;
}

export default function CaseStudyCard({ 
  title, 
  client, 
  category, 
  roi, 
  technicalDetails,
  image = "/images/projects/placeholder.svg" // fallback
}: CaseStudyCardProps) {
  return (
    <div className="flex flex-col border border-primary/10 bg-white group hover:shadow-luxury transition-shadow duration-500 rounded-none">
      <div className="relative h-64 overflow-hidden bg-primary">
        <AppImage 
           src={image} 
           alt={client} 
           fill 
           className="object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700" 
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/80 via-primary/40 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <span className="font-display tracking-ultra text-[10px] uppercase text-white/80 font-bold mb-2 block">
            {category}
          </span>
          <h3 className="font-display text-2xl text-white">
            {client}
          </h3>
        </div>
      </div>
      
      <div className="p-8 flex flex-col flex-1">
        <h4 className="font-body text-lg font-bold text-primary mb-4">
          {title}
        </h4>
        
        {/* Metrics Box */}
        <div className="bg-primary text-white p-6 border-l-4 border-secondary mb-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="font-display text-6xl">%</span>
           </div>
           <span className="font-body text-[10px] tracking-ultra text-white/50 uppercase block mb-1">Kanıtlanmış Başarı</span>
           <span className="font-display text-3xl font-bold">{roi}</span>
        </div>
        
        <p className="font-body text-[13px] text-secondary leading-relaxed mb-8 flex-1">
          <strong className="text-primary tracking-wide">Yazılımsal / Operasyonel Altyapı:</strong> {technicalDetails}
        </p>
        
        <CaseStudyDownload label={`${client} Vaka Analizi.pdf`} />
      </div>
    </div>
  );
}
