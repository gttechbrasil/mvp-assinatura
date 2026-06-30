import React from "react";
import { 
  Film, 
  Music, 
  Sparkles, 
  Package, 
  Play, 
  Clapperboard, 
  Tv, 
  Apple, 
  Star,
  Compass
} from "lucide-react";
import type { LucideProps } from "lucide-react";

interface ServiceIconProps extends Omit<LucideProps, "ref"> {
  service: string;
}

export const ServiceIcon: React.FC<ServiceIconProps> = ({ service, ...props }) => {
  const name = service.toLowerCase().trim();
  
  if (name.includes("netflix")) {
    return <Film {...props} />;
  }
  if (name.includes("spotify")) {
    return <Music {...props} />;
  }
  if (name.includes("disney")) {
    return <Sparkles {...props} />;
  }
  if (name.includes("prime") || name.includes("amazon")) {
    return <Package {...props} />;
  }
  if (name.includes("youtube")) {
    return <Play {...props} />;
  }
  if (name.includes("hbo") || name.includes("max")) {
    return <Clapperboard {...props} />;
  }
  if (name.includes("globoplay")) {
    return <Tv {...props} />;
  }
  if (name.includes("apple")) {
    return <Apple {...props} />;
  }
  if (name.includes("crunchyroll")) {
    return <Compass {...props} />;
  }
  if (name.includes("paramount")) {
    return <Star {...props} />;
  }
  
  return <Tv {...props} />;
};
