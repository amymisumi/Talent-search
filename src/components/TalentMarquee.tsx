const TalentMarquee = () => {
  // Sample talent photos - replace these with your actual talent photos
  const talentPhotos = [
    'https://media.istockphoto.com/id/1262964438/photo/success-happens-the-moment-you-believe-it-will.jpg?s=612x612&w=0&k=20&c=tpjbR4aaaiB43sneEWgatyFIQOmN3E-3nB5CBE5Idyg=',
    'https://media.istockphoto.com/id/1194465573/photo/portrait-of-smiling-african-american-woman.jpg?s=612x612&w=0&k=20&c=hD6As6gEFZobg44dhiHWkweVcKCv0NvPkk6XQChQKds=',
    'https://media.istockphoto.com/id/1299077582/photo/positivity-puts-you-in-a-position-of-power.jpg?s=612x612&w=0&k=20&c=baDuyrwRTscUZzyAqV44hnCq7d6tXUqwf26lJTcAE0A=',
    'https://media.istockphoto.com/id/2158303299/photo/studio-headshot-portrait-of-a-young-black-man.jpg?s=612x612&w=0&k=20&c=YtD8Bd4ptucVpQ8SyD0DPmE1Fx3JEJGn5BL5NnTHft0=',
    'https://media.istockphoto.com/id/1332295624/photo/i-got-this.jpg?s=612x612&w=0&k=20&c=avd7efxM3s80G_cVRQR4i5Kt9FLwZXbH3laBDi5ZS0w=',
    'https://media.istockphoto.com/id/171272361/photo/young-african-american-man-soccer-player.jpg?s=612x612&w=0&k=20&c=qRxLIyc8EFROkIjDe6KDN664Z-qmAoFuFnEvfFjt98g=',
    'https://media.istockphoto.com/id/143920409/photo/baseball-player.jpg?s=612x612&w=0&k=20&c=PpgxPvpLSlbkEsuRqjRNcFOiJjw4-p7qOSkLC7VBXB4=',
    'https://media.istockphoto.com/id/1422023484/photo/young-woman-using-the-mobile-phone-at-home.jpg?s=612x612&w=0&k=20&c=UuO1apep5uYk5hVHExJP9WtS0bcvbdqIIYpMuKD9wGw=',
  ];

  // Duplicate the array to create a seamless loop
  const doubleTalentPhotos = [...talentPhotos, ...talentPhotos];

  return (
    <section className="py-12 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">Our Talented Community</h2>
        <div className="relative w-full overflow-hidden">
          <div className="animate-marquee whitespace-nowrap">
            {doubleTalentPhotos.map((photo, index) => (
              <div 
                key={index}
                className="inline-block mx-4 w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg transform hover:scale-105 transition-transform duration-300"
              >
                <img 
                  src={photo} 
                  alt={`Talent ${index + 1}`} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 30s linear infinite;
            display: inline-block;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
        `
      }} />
    </section>
  );
};

export default TalentMarquee;
