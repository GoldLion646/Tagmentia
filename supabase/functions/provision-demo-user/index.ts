import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Function invoked, checking environment...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceRoleKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: serviceRoleKey?.length || 0
    });
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(`Missing environment variables: URL=${!!supabaseUrl}, KEY=${!!serviceRoleKey}`);
    }
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const demoEmail = 'demo@tagmentia.app';
    const demoPassword = 'Demo123!';

    console.log('Checking if demo user exists...');

    // Check if demo user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const existingUser = existingUsers.users.find(user => user.email === demoEmail);

    if (existingUser) {
      console.log('Demo user already exists:', existingUser.id);
      
      // Return existing user credentials for login
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Demo user ready',
        credentials: {
          email: demoEmail,
          password: demoPassword
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('Creating new demo user...');

    // Create demo user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: 'Demo',
        last_name: 'User'
      }
    });

    if (createError) {
      console.error('Error creating demo user:', createError);
      throw createError;
    }

    const demoUserId = newUser.user?.id;
    console.log('Demo user created successfully:', demoUserId);

    if (demoUserId) {
      console.log('Creating demo profile and data...');
      
      // Create profile for demo user
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: demoUserId,
          display_name: 'Demo User',
          avatar_url: null
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      } else {
        console.log('Profile created successfully');
      }

      // Create demo categories
      const { data: categories, error: categoryError } = await supabaseAdmin
        .from('categories')
        .insert([
          {
            user_id: demoUserId,
            name: 'Learning',
            description: 'Educational videos and tutorials',
            color: '#10B981'
          },
          {
            user_id: demoUserId,
            name: 'Entertainment',
            description: 'Fun and entertaining content',
            color: '#F59E0B'
          },
          {
            user_id: demoUserId,
            name: 'Fitness',
            description: 'Workout and health related videos',
            color: '#EF4444'
          }
        ])
        .select();

      if (categoryError) {
        console.error('Error creating demo categories:', categoryError);
      } else {
        console.log('Demo categories created successfully');

        // Create demo videos
        if (categories && categories.length > 0) {
          const { error: videoError } = await supabaseAdmin
            .from('videos')
            .insert([
              {
                user_id: demoUserId,
                category_id: categories[0].id, // Learning
                title: 'React Hooks Explained',
                url: 'https://www.youtube.com/watch?v=O6P86uwfdR0',
                thumbnail_url: 'https://img.youtube.com/vi/O6P86uwfdR0/mqdefault.jpg',
                platform: 'youtube',
                duration: 1200,
                notes: 'Great explanation of useState and useEffect hooks',
                tags: ['react', 'hooks', 'javascript'],
                is_watched: false
              },
              {
                user_id: demoUserId,
                category_id: categories[1].id, // Entertainment
                title: 'Funny Cat Compilation',
                url: 'https://www.youtube.com/watch?v=hFZFjoX2cGg',
                thumbnail_url: 'https://img.youtube.com/vi/hFZFjoX2cGg/mqdefault.jpg',
                platform: 'youtube',
                duration: 300,
                notes: 'Hilarious cats doing silly things',
                tags: ['cats', 'funny', 'pets'],
                is_watched: true
              },
              {
                user_id: demoUserId,
                category_id: categories[2].id, // Fitness
                title: '10 Minute Morning Workout',
                url: 'https://www.youtube.com/watch?v=UBMk30rjy0o',
                thumbnail_url: 'https://img.youtube.com/vi/UBMk30rjy0o/mqdefault.jpg',
                platform: 'youtube',
                duration: 600,
                notes: 'Perfect morning routine to start the day',
                tags: ['workout', 'morning', 'fitness'],
                is_watched: false
              }
            ]);

          if (videoError) {
            console.error('Error creating demo videos:', videoError);
          } else {
            console.log('Demo videos created successfully');
          }
        }

        // Create demo notes
        const { error: notesError } = await supabaseAdmin
          .from('notes')
          .insert([
            {
              user_id: demoUserId,
              category_id: categories[0].id,
              title: 'JavaScript Best Practices',
              content: 'Key takeaways:\n- Always use const/let instead of var\n- Use arrow functions for cleaner syntax\n- Implement error handling with try/catch',
              tags: ['javascript', 'best-practices', 'coding']
            },
            {
              user_id: demoUserId,
              category_id: categories[2].id,
              title: 'Workout Schedule',
              content: 'Weekly plan:\n- Monday: Upper body\n- Tuesday: Cardio\n- Wednesday: Lower body\n- Thursday: Rest\n- Friday: Full body\n- Weekend: Light activities',
              tags: ['fitness', 'schedule', 'workout-plan']
            }
          ]);

        if (notesError) {
          console.error('Error creating demo notes:', notesError);
        } else {
          console.log('Demo notes created successfully');
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Demo user created with sample data',
      credentials: {
        email: demoEmail,
        password: demoPassword
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in provision-demo-user function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});