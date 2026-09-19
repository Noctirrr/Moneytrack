import React from 'react';
import { 
  Utensils, 
  Car, 
  ShoppingBag, 
  Receipt, 
  Tv, 
  Briefcase, 
  Award, 
  TrendingUp, 
  MoreHorizontal, 
  Tag, 
  Coffee, 
  Heart, 
  Home, 
  Smartphone, 
  Gift,
  Banknote,
  Building2,
  PiggyBank,
  CreditCard,
  ArrowLeftRight,
  Wallet as WalletIcon
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-4 h-4', size = 16 }) => {
  switch (name) {
    case 'Banknote':
      return <Banknote className={className} size={size} />;
    case 'Building2':
      return <Building2 className={className} size={size} />;
    case 'PiggyBank':
      return <PiggyBank className={className} size={size} />;
    case 'CreditCard':
      return <CreditCard className={className} size={size} />;
    case 'ArrowLeftRight':
      return <ArrowLeftRight className={className} size={size} />;
    case 'Wallet':
    case 'WalletIcon':
      return <WalletIcon className={className} size={size} />;
    case 'Utensils':
      return <Utensils className={className} size={size} />;
    case 'Car':
      return <Car className={className} size={size} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} size={size} />;
    case 'Receipt':
      return <Receipt className={className} size={size} />;
    case 'Tv':
      return <Tv className={className} size={size} />;
    case 'Briefcase':
      return <Briefcase className={className} size={size} />;
    case 'Award':
      return <Award className={className} size={size} />;
    case 'TrendingUp':
      return <TrendingUp className={className} size={size} />;
    case 'Coffee':
      return <Coffee className={className} size={size} />;
    case 'Heart':
      return <Heart className={className} size={size} />;
    case 'Home':
      return <Home className={className} size={size} />;
    case 'Smartphone':
      return <Smartphone className={className} size={size} />;
    case 'Gift':
      return <Gift className={className} size={size} />;
    case 'MoreHorizontal':
    default:
      return <Tag className={className} size={size} />;
  }
};
