import { Metadata } from 'next';

export const generateMetadata = async ({ params }: { params: { username: string } }): Promise<Metadata> => {
  return {
    title: 'Veilo',
  };
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
