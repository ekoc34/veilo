import { Metadata } from 'next';

type Props = {
  params: Promise<{ username: string }>;
  children: React.ReactNode;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  // Await params for Next.js 15+
  await params;
  
  return {
    title: 'Veilo',
  };
};

export default function ProfileLayout({
  children,
}: Props) {
  return <>{children}</>;
}
